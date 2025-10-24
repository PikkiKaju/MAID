using backend_aspdotnet.Models;
using backend_aspdotnet.Database;
using Microsoft.EntityFrameworkCore;

namespace backend_aspdotnet.Services
{
    public interface IUserRepository
    {
        Task<User?> GetByUsernameAsync(string username);
        Task<User?> GetByUserIdAsync(Guid userId);
        Task<bool> ExistsByUsernameAsync(string username);
        Task AddAsync(User user);
        Task<Blocked?> GetBlockedEntryAsync(Guid userId);
        Task RemoveBlockedEntryAsync(Blocked blocked);
    }

    public class UserRepository : IUserRepository
    {
        private readonly AppDbContext _context;

        public UserRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<User?> GetByUsernameAsync(string username)
            => await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        
        public async Task<User?>  GetByUserIdAsync(Guid userId)
            => await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

        public async Task<bool> ExistsByUsernameAsync(string username)
            => await _context.Users.AnyAsync(u => u.Username == username);

        public async Task AddAsync(User user)
        {
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
        }

        public async Task<Blocked?> GetBlockedEntryAsync(Guid userId)
            => await _context.Blocked.FirstOrDefaultAsync(b => b.UserId == userId);

        public async Task RemoveBlockedEntryAsync(Blocked blocked)
        {
            _context.Blocked.Remove(blocked);
            await _context.SaveChangesAsync();
        }
    }
}