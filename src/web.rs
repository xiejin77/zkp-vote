// 异步Web服务示例

use crate::{VoteCircuit, VoteSystem};
use ark_bn254::{Bn254, Fr};
use ark_groth16::Groth16;
use ark_std::rand::thread_rng;
use std::sync::Arc;
use tokio::sync::Mutex;
use warp::Filter;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

// 投票请求
#[derive(serde::Deserialize)]
struct VoteRequest {
    vote: u8,      // 投票选择 (0 或 1)
    user_id: String, // 用户ID（用于内部处理，不会暴露在证明中）
}

// 投票响应
#[derive(serde::Serialize)]
struct VoteResponse {
    success: bool,
    message: String,
}

// 应用状态
#[derive(Clone)]
pub struct AppState {
    vote_system: Arc<Mutex<VoteSystem<Fr, Groth16<Bn254>>>>,
    proving_key: Arc<Groth16<Bn254>::ProvingKey>,
    verifying_key: Arc<Groth16<Bn254>::VerifyingKey>,
}

impl AppState {
    pub fn new() -> Self {
        // 初始化投票系统
        let mut rng = thread_rng();
        let (vote_system, proving_key, verifying_key) = VoteSystem::<Fr, Groth16<Bn254>>::setup(&mut rng)
            .expect("Failed to setup vote system");
        
        Self {
            vote_system: Arc::new(Mutex::new(vote_system)),
            proving_key: Arc::new(proving_key),
            verifying_key: Arc::new(verifying_key),
        }
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
    // 验证投票选择
    if req.vote != 0 && req.vote != 1 {
        let response = VoteResponse {
            success: false,
            message: "Invalid vote choice. Must be 0 or 1.".to_string(),
        };
        return Ok(warp::reply::json(&response));
    }
    
    // 创建投票电路
    let vote = if req.vote == 1 { Fr::one() } else { Fr::zero() };
    let nullifier = Fr::from(calculate_nullifier(&req.user_id)); // 基于用户ID计算防重标识
    let randomness = Fr::from(rand::random::<u64>()); // 生成额外随机值用于混淆
    let circuit = VoteCircuit { vote, nullifier, randomness };
    
    // 异步生成证明
    let proof = {
        let mut rng = thread_rng();
        let vote_system = state.vote_system.lock().await;
        vote_system.vote(&state.proving_key, circuit, &mut rng)
            .map_err(|_| warp::reject::custom(ProofGenerationError))
    };
    
    match proof {
        Ok(_) => {
            let response = VoteResponse {
                success: true,
                message: "Vote submitted successfully.".to_string(),
            };
            Ok(warp::reply::json(&response))
        }
        Err(_) => {
            let response = VoteResponse {
                success: false,
                message: "Failed to generate proof.".to_string(),
            };
            Ok(warp::reply::json(&response))
        }
    }
}

// 基于用户ID计算防重标识
fn calculate_nullifier(user_id: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    user_id.hash(&mut hasher);
    hasher.finish()
}

// 自定义错误类型
#[derive(Debug)]
struct ProofGenerationError;

impl warp::reject::Reject for ProofGenerationError {}