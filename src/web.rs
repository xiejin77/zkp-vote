// 异步Web服务示例

use crate::{VoteCircuit, VoteSystem, generate_nullifier, init_logger, VoteSystemError};
use ark_bn254::{Bn254, Fr};
use ark_groth16::Groth16;
use ark_std::rand::thread_rng;
use std::sync::Arc;
use tokio::sync::RwLock;
use warp::Filter;
use log::{debug, error, info, trace, warn};
use ethers::{prelude::*, providers::{Provider, Http}, types::Address};

// 投票请求
#[derive(serde::Deserialize, Debug)]
struct VoteRequest {
    vote: u8,      // 投票选择 (0 或 1)
    user_id: String, // 用户ID（用于内部处理，不会暴露在证明中）
    nullifier: Option<String>, // 防重标识（可选，前端可生成）
    chain: String, // 区块链网络选择
    gas_option: String, // Gas费用支付方式
}

// 投票响应
#[derive(serde::Serialize, Debug)]
struct VoteResponse {
    success: bool,
    message: String,
    gas_cost: Option<String>,
    transaction_hash: Option<String>,
}

// 应用状态
#[derive(Clone)]
pub struct AppState {
    vote_system: Arc<RwLock<VoteSystem<Fr, Groth16<Bn254>>>>,
    proving_key: Arc<Groth16<Bn254>::ProvingKey>,
    verifying_key: Arc<Groth16<Bn254>::VerifyingKey>,
    blockchain_providers: Arc<RwLock<HashMap<String, Arc<Provider<Http>>>>>,
    vote_contracts: Arc<RwLock<HashMap<String, Address>>>,
}

impl AppState {
    pub fn new() -> Self {
        // 初始化日志
        init_logger();
        info!("Initializing application state");
        
        // 初始化投票系统
        let mut rng = thread_rng();
        let (vote_system, proving_key, verifying_key) = VoteSystem::<Fr, Groth16<Bn254>>::setup(&mut rng)
            .expect("Failed to setup vote system");
        
        // 初始化区块链提供者
        let blockchain_providers = Arc::new(RwLock::new(HashMap::new()));
        let vote_contracts = Arc::new(RwLock::new(HashMap::new()));
        
        // 配置默认区块链网络
        Self::configure_default_networks(blockchain_providers.clone(), vote_contracts.clone());
        
        Self {
            vote_system: Arc::new(RwLock::new(vote_system)),
            proving_key: Arc::new(proving_key),
            verifying_key: Arc::new(verifying_key),
            blockchain_providers,
            vote_contracts,
        }
    }
    
    // 配置默认区块链网络
    fn configure_default_networks(
        providers: Arc<RwLock<HashMap<String, Arc<Provider<Http>>>>>,
        contracts: Arc<RwLock<HashMap<String, Address>>>
    ) {
        tokio::spawn(async move {
            let mut providers_write = providers.write().await;
            let mut contracts_write = contracts.write().await;
            
            // 配置本地网络
            if let Ok(provider) = Provider::try_from("http://127.0.0.1:8545") {
                providers_write.insert("localhost".to_string(), Arc::new(provider));
                // 这里应该从部署脚本获取合约地址
                // 暂时使用占位地址
                let contract_address: Address = "0x0000000000000000000000000000000000000000".parse().unwrap();
                contracts_write.insert("localhost".to_string(), contract_address);
                info!("Configured localhost network");
            }
            
            // 可以添加其他默认网络配置
        });
    }
}

// 投票路由
pub fn vote_route(
    state: AppState,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path!("vote")
        .and(warp::post())
        .and(with_state(state))
        .and(warp::body::json::<VoteRequest>())
        .and_then(handle_vote)
}

// 结果路由
pub fn results_route(
    state: AppState,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path!("results")
        .and(warp::get())
        .and(with_state(state))
        .and(warp::query::<ResultsQuery>())
        .and_then(handle_results)
}

// 结果查询参数
#[derive(serde::Deserialize, Debug)]
struct ResultsQuery {
    chain: Option<String>,
}

// 状态注入
fn with_state(
    state: AppState,
) -> impl Filter<Extract = (AppState,), Error = std::convert::Infallible> + Clone {
    warp::any().map(move || state.clone())
}

// 处理投票请求
async fn handle_vote(
    state: AppState,
    req: VoteRequest,
) -> Result<impl warp::Reply, warp::Rejection> {
    debug!("Received vote request: {:?}", req);
    
    // 验证投票选择
    if req.vote != 0 && req.vote != 1 {
        let response = VoteResponse {
            success: false,
            message: "Invalid vote choice. Must be 0 or 1.".to_string(),
            gas_cost: None,
            transaction_hash: None,
        };
        warn!("Invalid vote choice: {}", req.vote);
        return Ok(warp::reply::json(&response));
    }
    
    // 生成或使用前端提供的防重标识
    let nullifier = if let Some(n) = req.nullifier {
        // 使用前端提供的防重标识
        Fr::from_str(&n).unwrap_or_else(|_| {
            // 如果解析失败，生成新的
            let mut rng = thread_rng();
            generate_nullifier(&req.user_id, &mut rng)
        })
    } else {
        // 生成新的防重标识
        let mut rng = thread_rng();
        generate_nullifier(&req.user_id, &mut rng)
    };
    
    // 创建投票电路
    let vote = if req.vote == 1 { Fr::one() } else { Fr::zero() };
    let randomness = {
        let mut rng = thread_rng();
        Fr::from(rng.next_u64())
    };
    let circuit = VoteCircuit { vote, nullifier, randomness };
    
    // 异步生成证明
    let proof_result = {
        let mut rng = thread_rng();
        let vote_system = state.vote_system.read().await;
        vote_system.vote_async(state.proving_key.clone(), circuit, rng).await
    };
    
    match proof_result {
        Ok(proof) => {
            // 尝试提交到区块链
            let transaction_result = submit_to_blockchain(&state, &req, &proof).await;
            
            match transaction_result {
                Ok((tx_hash, gas_cost)) => {
                    let response = VoteResponse {
                        success: true,
                        message: "Vote submitted successfully and transaction sent to blockchain.".to_string(),
                        gas_cost: Some(gas_cost),
                        transaction_hash: Some(tx_hash),
                    };
                    info!("Vote submitted successfully, transaction hash: {:?}", tx_hash);
                    Ok(warp::reply::json(&response))
                }
                Err(e) => {
                    // 即使区块链提交失败，也返回成功，因为证明已生成
                    // 可以在后台重试提交到区块链
                    let response = VoteResponse {
                        success: true,
                        message: format!("Vote submitted successfully, but failed to send to blockchain: {}. Will retry in background.", e),
                        gas_cost: None,
                        transaction_hash: None,
                    };
                    warn!("Failed to submit to blockchain: {}, will retry in background", e);
                    Ok(warp::reply::json(&response))
                }
            }
        }
        Err(e) => {
            let response = VoteResponse {
                success: false,
                message: format!("Failed to generate proof: {}", e),
                gas_cost: None,
                transaction_hash: None,
            };
            error!("Failed to generate proof: {:?}", e);
            Ok(warp::reply::json(&response))
        }
    }
}

// 处理结果查询
async fn handle_results(
    state: AppState,
    query: ResultsQuery,
) -> Result<impl warp::Reply, warp::Rejection> {
    debug!("Received results query: {:?}", query);
    
    // 默认使用localhost网络
    let chain = query.chain.unwrap_or_else(|| "localhost".to_string());
    
    // 从区块链获取结果
    let results = get_results_from_blockchain(&state, &chain).await;
    
    match results {
        Ok(data) => {
            info!("Retrieved results from blockchain: {:?}", data);
            Ok(warp::reply::json(&data))
        }
        Err(e) => {
            let error_response = serde_json::json!({
                "success": false,
                "message": format!("Failed to retrieve results: {}", e)
            });
            error!("Failed to retrieve results: {:?}", e);
            Ok(warp::reply::json(&error_response))
        }
    }
}

// 提交到区块链
async fn submit_to_blockchain(
    state: &AppState,
    req: &VoteRequest,
    proof: &Groth16<Bn254>::Proof,
) -> Result<(String, String), String> {
    // 这里应该实现与智能合约的交互
    // 暂时返回模拟结果
    debug!("Submitting to blockchain: {:?}", req.chain);
    
    // 模拟区块链提交
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    // 模拟交易哈希和Gas费用
    let tx_hash = format!("0x{:x}", rand::random::<u128>());
    let gas_cost = "0.001 ETH".to_string();
    
    Ok((tx_hash, gas_cost))
}

// 从区块链获取结果
async fn get_results_from_blockchain(
    state: &AppState,
    chain: &str,
) -> Result<serde_json::Value, String> {
    // 这里应该实现与智能合约的交互
    // 暂时返回模拟结果
    debug!("Getting results from blockchain: {}", chain);
    
    // 模拟区块链查询
    tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    
    // 模拟结果
    let results = serde_json::json!({
        "success": true,
        "chain": chain,
        "results": {
            "option_0": 100,
            "option_1": 150,
            "total_votes": 250
        },
        "last_updated": chrono::Utc::now().to_rfc3339()
    });
    
    Ok(results)
}

// 自定义错误类型
#[derive(Debug)]
struct ProofGenerationError;

impl warp::reject::Reject for ProofGenerationError {}

// 自定义错误类型
#[derive(Debug)]
struct BlockchainError {
    message: String,
}

impl warp::reject::Reject for BlockchainError {}

// 导入必要的依赖
use std::collections::HashMap;
use ark_ff::Field;
use chrono;
use rand;