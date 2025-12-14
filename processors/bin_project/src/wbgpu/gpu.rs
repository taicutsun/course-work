use num_bigint::BigUint;
use crate::algorithm::{binary_pow, big_binary_pow};
use crate::wbgpu::gpu_common::{GpuContext, run_compute_shader};
use std::time::Instant;

pub fn gpu_pow(base: u128, exp: u128) -> (String, u128) {
    let start = Instant::now();
    
    let context = GpuContext::new();
    
    let gpu_base = (base & u32::MAX as u128) as u32;
    let gpu_exp = (exp & u32::MAX as u128) as u32;
    let input_data = [gpu_base, gpu_exp];
    
    let gpu_result: u32 = run_compute_shader(
        &context,
        include_str!("binary_pow.wgsl"),
        "Binary Exponentiation Shader",
        "Binary Exponentiation Pipeline",
        &input_data,
    );

    let gpu_delay = start.elapsed().as_nanos();
    
    let final_result = if base <= u32::MAX as u128 && exp <= u32::MAX as u128 {
        gpu_result as u128
    } else {
        binary_pow(base, exp)
    };
    
    (final_result.to_string(), gpu_delay)
}


pub fn gpu_big_pow(base: BigUint, exp: BigUint) -> (BigUint, u128) {
    let start = Instant::now();
    
    // For BigUint, we need to break down into smaller chunks that fit in GPU
    // Since GPU shaders work with u32, we'll process in chunks
    let base_bytes = base.to_bytes_be();
    let exp_bytes = exp.to_bytes_be();
    
    // Check if values are small enough for direct GPU processing
    if base_bytes.len() <= 4 && exp_bytes.len() <= 4 {
        // Can use GPU directly
        let context = GpuContext::new();
        let base_u32 = u32::from_be_bytes([
            base_bytes.get(3).copied().unwrap_or(0),
            base_bytes.get(2).copied().unwrap_or(0), 
            base_bytes.get(1).copied().unwrap_or(0),
            base_bytes.get(0).copied().unwrap_or(0),
        ]);
        let exp_u32 = u32::from_be_bytes([
            exp_bytes.get(3).copied().unwrap_or(0),
            exp_bytes.get(2).copied().unwrap_or(0),
            exp_bytes.get(1).copied().unwrap_or(0),
            exp_bytes.get(0).copied().unwrap_or(0),
        ]);
        
        let input_data = [base_u32, exp_u32];
        let gpu_result: u32 = run_compute_shader(
            &context,
            include_str!("binary_pow.wgsl"),
            "Binary Exponentiation Shader",
            "Binary Exponentiation Pipeline",
            &input_data,
        );
        
        let result = BigUint::from(gpu_result);
        let duration = start.elapsed().as_nanos();
        (result, duration)
    } else {
        // Fall back to CPU for large numbers
        let result = big_binary_pow(base, exp);
        let duration = start.elapsed().as_nanos();
        (result, duration)
    }
}

 
