using backend_aspdotnet.Helpers;
using backend_aspdotnet.Models;
using BCrypt.Net;

namespace backend_aspdotnet.Services
{
    public class AuthService
    {
        private readonly IConfiguration _config;

        public AuthService(IConfiguration config)
        {
            _config = config;
        }

        public string HashPassword(string password) =>
            BCrypt.Net.BCrypt.HashPassword(password);

        public bool ValidatePassword(string plain, string hash) =>
            BCrypt.Net.BCrypt.Verify(plain, hash);
      

        public string GenerateJwt(User user) =>
            JwtHelper.GenerateToken(user, _config["Jwt:Key"]);
    }

}
