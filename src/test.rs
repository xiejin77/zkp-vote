// 投票系统测试用例

#[cfg(test)]
mod tests {
    use super::*;
    use ark_bn254::{Bn254, Fr};
    use ark_crypto_primitives::snark::SNARK;
    use ark_groth16::Groth16;
    use ark_std::rand::thread_rng;
    use ark_relations::r1cs::ConstraintSystem;

    #[test]
    fn test_vote_system() {
        // 初始化系统
        let mut rng = thread_rng();
        let (system, pk, vk) = VoteSystem::<Fr, Groth16<Bn254>>::setup(&mut rng).unwrap();
        
        // 创建投票电路实例
        let vote = Fr::one();  // 投票给选项1
        let nullifier = Fr::from(12345u64);  // 防重标识
        let randomness = Fr::from(67890u64); // 额外随机值
        let circuit = VoteCircuit { vote, nullifier, randomness };
        
        // 生成证明
        let proof = system.vote(&pk, circuit, &mut rng).unwrap();
        
        // 验证证明（不直接暴露投票值）
        // 在实际应用中，可能需要提供一些公开输入（如nullifier的哈希值等）
        let public_inputs = vec![]; // 简化处理，实际应用中可能需要一些公开输入
        let is_valid = system.verify(&vk, &public_inputs, &proof).unwrap();
        
        // 断言验证结果为真
        assert!(is_valid);
    }
    
    #[test]
    fn test_invalid_vote() {
        // 初始化系统
        let mut rng = thread_rng();
        let (system, pk, vk) = VoteSystem::<Fr, Groth16<Bn254>>::setup(&mut rng).unwrap();
        
        // 创建投票电路实例（无效投票）
        let vote = Fr::from(2u64);  // 无效投票选择
        let nullifier = Fr::from(12345u64);  // 防重标识
        let randomness = Fr::from(67890u64); // 额外随机值
        let circuit = VoteCircuit { vote, nullifier, randomness };
        
        // 生成证明（应该失败）
        let proof_result = system.vote(&pk, circuit, &mut rng);
        
        // 断言生成证明失败
        assert!(proof_result.is_err());
    }
    
    #[test]
    fn test_circuit_constraints() {
        // 测试电路约束是否正确
        let cs = ConstraintSystem::new_ref();
        
        // 有效投票
        let vote = Fr::one();
        let nullifier = Fr::from(12345u64);
        let randomness = Fr::from(67890u64);
        let circuit = VoteCircuit { vote, nullifier, randomness };
        
        circuit.generate_constraints(cs.clone()).unwrap();
        assert!(cs.is_satisfied().unwrap());
    }
    
    #[test]
    fn test_nullifier_calculation() {
        // 测试防重标识计算
        let user_id1 = "user1";
        let user_id2 = "user2";
        
        let nullifier1 = super::super::calculate_nullifier(user_id1);
        let nullifier2 = super::super::calculate_nullifier(user_id2);
        
        // 确保不同用户ID产生不同的防重标识
        assert_ne!(nullifier1, nullifier2);
    }
}