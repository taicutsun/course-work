use num_bigint::BigUint;
use num_traits::{One, Zero};

/// Compute base^exp using binary exponentiation (fast exponentiation).
pub fn binary_pow(mut base: u128, mut exp: u128) -> u128 {
    let mut result: u128 = 1;
    while exp > 0 {
        if (exp & 1) == 1 {
            result = result.wrapping_mul(base);
        }
        base = base.wrapping_mul(base);
        exp >>= 1;
    }
    result
}


/// BigUint binary exponentiation
pub fn big_binary_pow(mut base: BigUint, mut exp: BigUint) -> BigUint {
    let one = BigUint::one();
    let mut result = BigUint::one();
    while !exp.is_zero() {
        if &exp & &one == one {
            result = result * &base;
        }
        base = &base * &base;
        exp >>= 1u32;
    }
    result
}

