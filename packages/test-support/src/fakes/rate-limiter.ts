// `RateLimiter` port fake (03-routes-and-contracts.md §3:
// `hit(key, limit, windowSec) -> {allowed, retryAfter}`). Task step 5:
// "AlwaysAllowRateLimiter".
export class AlwaysAllowRateLimiter {
  hit(_key: string, _limit: number, _windowSec: number): Promise<{ allowed: boolean; retryAfter?: number }> {
    void _key;
    void _limit;
    void _windowSec;
    return Promise.resolve({ allowed: true });
  }
}
