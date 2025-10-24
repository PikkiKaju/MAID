using Xunit;
using Moq;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

public class RedisRepositoryTests
{
    private readonly Mock<IConnectionMultiplexer> _redisMock = new();
    private readonly Mock<IDatabase> _dbMock = new();
    private readonly RedisRepository _repo;

    public RedisRepositoryTests()
    {
        // Setup: when GetDatabase() is called, return our mock
        _redisMock.Setup(r => r.GetDatabase(It.IsAny<int>(), It.IsAny<object>())).Returns(_dbMock.Object);
        _repo = new RedisRepository(_redisMock.Object);
    }

    [Fact]
    public async Task SetStringAsync_ShouldCallStringSetAsync()
    {
        // Arrange
        var key = "test:key";
        var value = "hello";

        // Act
        await _repo.SetStringAsync(key, value, TimeSpan.FromMinutes(1));

        // Assert
        _dbMock.Verify(db => db.StringSetAsync(key, value, TimeSpan.FromMinutes(1), false, When.Always, CommandFlags.None),
                       Times.Once);
    }

    [Fact]
    public async Task GetStringAsync_ShouldReturnValue_WhenExists()
    {
        // Arrange
        var key = "test:key";
        var expected = "world";
        _dbMock.Setup(db => db.StringGetAsync(key, It.IsAny<CommandFlags>()))
               .ReturnsAsync((RedisValue)expected);

        // Act
        var result = await _repo.GetStringAsync(key);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public async Task GetStringAsync_ShouldReturnNull_WhenEmpty()
    {
        // Arrange
        var key = "missing:key";
        _dbMock.Setup(db => db.StringGetAsync(key, It.IsAny<CommandFlags>()))
               .ReturnsAsync(RedisValue.Null);

        // Act
        var result = await _repo.GetStringAsync(key);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task RemoveAsync_ShouldCallKeyDeleteAsync()
    {
        // Arrange
        var key = "delete:key";

        // Act
        await _repo.RemoveAsync(key);

        // Assert
        _dbMock.Verify(db => db.KeyDeleteAsync(key, CommandFlags.None), Times.Once);
    }

    [Fact]
    public async Task FindKeysByValueAsync_ShouldReturnMatchingKeys()
    {
        // Arrange
        var mockServer = new Mock<IServer>();
        var keys = new RedisKey[] { "refresh:1", "refresh:2", "other:3" };

        mockServer.Setup(s => s.Keys(It.IsAny<int>(), "refresh:*", It.IsAny<int>(), It.IsAny<long>(), It.IsAny<int>(), It.IsAny<CommandFlags>()))
                  .Returns(keys);

        _redisMock.Setup(r => r.GetEndPoints(It.IsAny<bool>())).Returns(new EndPoint[] { new DnsEndPoint("localhost", 6379) });
        _redisMock.Setup(r => r.GetServer(It.IsAny<EndPoint>(), It.IsAny<object>())).Returns(mockServer.Object);

        _dbMock.Setup(db => db.StringGetAsync("refresh:1", It.IsAny<CommandFlags>())).ReturnsAsync((RedisValue)"tokenA");
        _dbMock.Setup(db => db.StringGetAsync("refresh:2", It.IsAny<CommandFlags>())).ReturnsAsync((RedisValue)"tokenB");

        var repo = new RedisRepository(_redisMock.Object);

        // Act
        var result = await repo.FindKeysByValueAsync("tokenA");

        // Assert
        Assert.Single(result);
        Assert.Contains("refresh:1", result);
    }
}
