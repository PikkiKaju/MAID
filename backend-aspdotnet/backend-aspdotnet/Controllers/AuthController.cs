using backend_aspdotnet.Database;
using backend_aspdotnet.DTOs;
using backend_aspdotnet.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend_aspdotnet.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto dto)
        {
            var user = PostgresDriver.ValidateUser(dto.Username);
            if (user == null || !_authService.ValidatePassword(dto.Password, user.Password))
                return Unauthorized("Invalid username or password.");

            var token = _authService.GenerateJwt(user);
            return Ok(new { token });
        }

        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterDto dto)
        {
            // add confirm password  ??? 
            // email hash ?? 

            var passwordHash = _authService.HashPassword(dto.Password);
            var emailHash = _authService.HashPassword(dto.Email);
            var result = PostgresDriver.RegisterUser(dto.Username,emailHash, passwordHash);
            if (!result)
                return BadRequest("User already exists.");

            return Ok("User registered.");
        }
    }
}
