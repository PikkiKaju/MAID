using StackExchange.Redis;


public interface IRedisRepository
    {
        /// <summary>
        /// Set a string key/value pair in Redis, optionally with expiration.
        /// </summary>
        Task SetStringAsync(string key, string value, TimeSpan? expiry = null);

        /// <summary>
        /// Get a string value by key. Returns null if not found.
        /// </summary>
        Task<string?> GetStringAsync(string key);

        /// <summary>
        /// Remove a key from Redis.
        /// </summary>
        Task RemoveAsync(string key);

        /// <summary>
        /// Find all keys that have a specific value (used for refresh tokens).
        /// </summary>
        Task<IEnumerable<string>> FindKeysByValueAsync(string value);
    }
public class RedisRepository : IRedisRepository
{
    private readonly IDatabase _db;
    private readonly IConnectionMultiplexer _redis;

    public RedisRepository(IConnectionMultiplexer redis)
    {
        _redis = redis;
        _db = redis.GetDatabase();
    }

    public async Task SetStringAsync(string key, string value, TimeSpan? expiry = null)
        => await _db.StringSetAsync(key, value, expiry);

    public async Task<string?> GetStringAsync(string key)
    {
        var val = await _db.StringGetAsync(key);
        return val.IsNullOrEmpty ? null : val.ToString();
    }

    public async Task RemoveAsync(string key) => await _db.KeyDeleteAsync(key);

    public async Task<IEnumerable<string>> FindKeysByValueAsync(string value)
    {
        var endpoints = _redis.GetEndPoints();
        var server = _redis.GetServer(endpoints.First());
        var keys = server.Keys(pattern: "refresh:*");
        var matching = new List<string>();
        foreach (var key in keys)
        {
            if (await _db.StringGetAsync(key) == value)
                matching.Add(key);
        }
        return matching;
    }
}
