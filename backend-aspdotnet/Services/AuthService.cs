using backend_aspdotnet.Helpers;
using backend_aspdotnet.Models;
using backend_aspdotnet.DTOs;
using System.Security.Cryptography;
using backend_aspdotnet.Database;

namespace backend_aspdotnet.Services
{
   public interface IAuthService
{
    Task<(bool Success, string? Token,string? RefreshToken, string? Error)> LoginAsync(LoginDto dto);
    Task<(bool Success, string? Error)> LogoutAsync(string refreshToken);
    Task<(bool Success, string? Token, string? RefreshToken,string? Error)> RegisterAsync(RegisterDto dto);
    Task AddRefreshTokenAsync(RefreshToken token);
    Task<RefreshToken?> GetRefreshTokenAsync(string token);
    Task RemoveRefreshTokenAsync(RefreshToken token);
    Task<(bool Success, string? Token, string? NewRefreshToken, string? Error)> RefreshAsync(string refreshToken);
    string HashPassword(string password);
    bool ValidatePassword(string plain, string hash);
  
}

public class AuthService : IAuthService
{
    private readonly IConfiguration _config;
    private readonly IUserRepository _users;
    private readonly IRefreshTokenRepository _refreshToken;

    public AuthService(IConfiguration config, IUserRepository users,IRefreshTokenRepository refreshToken)
    {
        _config = config;
        _users = users;
        _refreshToken = refreshToken;
    }

    public string HashPassword(string password) =>
        BCrypt.Net.BCrypt.HashPassword(password);

    public bool ValidatePassword(string plain, string hash) =>
        BCrypt.Net.BCrypt.Verify(plain, hash);

    public async Task<(bool Success, string? Token, string? RefreshToken, string? Error)> LoginAsync(LoginDto dto)
    {
        var user = await _users.GetByUsernameAsync(dto.Username);
        if (user == null || !ValidatePassword(dto.Password, user.Password))
            return (false, null, null, "Invalid username or password.");

        var blockedEntry = await _users.GetBlockedEntryAsync(user.Id);
        if (blockedEntry != null)
        {
            if (blockedEntry.BlockedUntil > DateTime.UtcNow)
                return (false, null, null, $"User is blocked until {blockedEntry.BlockedUntil:u}");
            else
                await _users.RemoveBlockedEntryAsync(blockedEntry);
        }

        var accessToken = JwtHelper.GenerateToken(user, _config["Jwt:Key"]);
        var existingTokens = await _refreshToken.GetByTokenAsync(user.Id.ToString());
        if (existingTokens != null)
        {
            await _refreshToken.RemoveAsync(existingTokens);
        }
        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };
        await _refreshToken.AddAsync(refreshToken);

        return (true, accessToken, refreshToken.Token, null);
    }

    public async Task<(bool Success, string? Error)> LogoutAsync(string refreshToken)
    {
            var existing = await _refreshToken.GetByTokenAsync(refreshToken);
            if (existing == null)
                return (false, "Invalid refresh token.");

            await _refreshToken.RemoveAsync(existing);
            return (true, null);
    }
    public async Task AddRefreshTokenAsync(RefreshToken token)
    {
        await _refreshToken.AddAsync(token);
    }

    public async Task<RefreshToken?> GetRefreshTokenAsync(string token)
        => await _refreshToken.GetByTokenAsync(token);

    public async Task RemoveRefreshTokenAsync(RefreshToken token)
    {
        await _refreshToken.RemoveAsync(token);
    }


    public async Task<(bool Success, string? Token, string? RefreshToken, string? Error)> RegisterAsync(RegisterDto dto)
        {
            var exists = await _users.ExistsByUsernameAsync(dto.Username);
            if (exists)
                return (false, null, null, "User already exists.");

            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = dto.Username,
                Email = dto.Email,
                Password = HashPassword(dto.Password)
            };

            await _users.AddAsync(user);
            var accessToken = JwtHelper.GenerateToken(user, _config["Jwt:Key"]);
            var refreshToken = new RefreshToken
            {
                UserId = user.Id,
                Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };
            await _refreshToken.AddAsync(refreshToken);

            return (true, accessToken, refreshToken.Token, null);
        }
    public async Task<(bool Success, string? Token, string? NewRefreshToken, string? Error)> RefreshAsync(string refreshToken)
        {
            var existing = await _refreshToken.GetByTokenAsync(refreshToken);
            if (existing == null || existing.IsRevoked || existing.ExpiresAt < DateTime.UtcNow)
                return (false, null, null, "Invalid or expired refresh token.");

            var user = await _users.GetByUserIdAsync(existing.UserId);
            if (user == null)
                return (false, null, null, "User not found.");

            // Revoke the old token
            await _refreshToken.RemoveAsync(existing);

            // Issue new pair
            var newAccessToken = JwtHelper.GenerateToken(user, _config["Jwt:Key"]);
            var newRefresh = new RefreshToken
            {
                UserId = user.Id,
                Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };
            await _refreshToken.AddAsync(newRefresh);

            return (true, newAccessToken, newRefresh.Token, null);
        }

}


}
