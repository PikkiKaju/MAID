using Xunit;
using StackExchange.Redis;
using System;
using System.Threading.Tasks;


[Trait("Category", "Integration")]
public class RedisRepositoryIntegrationTests : IAsyncLifetime
{
    private IConnectionMultiplexer _redisConnection;
    private RedisRepository _repository;

    // Runs before any test
    public async Task InitializeAsync()
    {
        // Connect to local Redis (adjust host/port if needed)
        _redisConnection = await ConnectionMultiplexer.ConnectAsync("localhost:6379");
        _repository = new RedisRepository(_redisConnection);

        // Clean up old keys (so tests are deterministic)
        var server = _redisConnection.GetServer("localhost", 6379);
        foreach (var key in server.Keys(pattern: "integration:*"))
            await _repository.RemoveAsync(key);
    }

    // Runs after all tests
    public async Task DisposeAsync()
    {
        if (_redisConnection != null)
            await _redisConnection.CloseAsync();
    }

    [Fact]
    public async Task SetStringAsync_ThenGetStringAsync_ShouldReturnSameValue()
    {
        // Arrange
        var key = "integration:test1";
        var value = "Hello Redis!";

        // Act
        await _repository.SetStringAsync(key, value, TimeSpan.FromMinutes(1));
        var result = await _repository.GetStringAsync(key);

        // Assert
        Assert.Equal(value, result);
    }

    [Fact]
    public async Task RemoveAsync_ShouldDeleteKey()
    {
        // Arrange
        var key = "integration:test2";
        await _repository.SetStringAsync(key, "to delete");

        // Act
        await _repository.RemoveAsync(key);
        var result = await _repository.GetStringAsync(key);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task FindKeysByValueAsync_ShouldFindMatchingKey()
    {
        // Arrange
        var value = "match-value";
        var key = "integration:refresh:123";

        await _repository.SetStringAsync(key, value);

        // Act
        var result = await _repository.FindKeysByValueAsync(value);

        // Assert
        Assert.Contains(key, result);
    }
}
