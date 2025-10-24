using backend_aspdotnet.Models;
using backend_aspdotnet.Database;
using Microsoft.EntityFrameworkCore;

namespace backend_aspdotnet.Services
{
    public interface IRefreshTokenRepository
    {
        Task<RefreshToken?> GetByTokenAsync(string token);
    
        Task AddAsync(RefreshToken token);
        Task RemoveAsync(RefreshToken token);
        Task UpdateAsync(RefreshToken token);
    }

    public class RefreshTokenRepository : IRefreshTokenRepository
    {
        private readonly AppDbContext _context;

        public RefreshTokenRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<RefreshToken?> GetByTokenAsync(string token)
        {
            return await _context.RefreshTokens.FirstOrDefaultAsync(r => r.Token == token);
        }

        public async Task AddAsync(RefreshToken token)
        {
            _context.RefreshTokens.Add(token);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveAsync(RefreshToken token)
        {
            _context.RefreshTokens.Remove(token);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(RefreshToken token)
        {
            _context.RefreshTokens.Update(token);
               await _context.SaveChangesAsync();
        }

    }
}