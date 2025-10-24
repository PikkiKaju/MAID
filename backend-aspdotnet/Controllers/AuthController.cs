using backend_aspdotnet.DTOs;
using backend_aspdotnet.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend_aspdotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _auth;

        public AuthController(IAuthService authService)
        {
            _auth = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var (success, token, refreshToken, error) = await _auth.LoginAsync(dto);
            if (!success)
                return Unauthorized(error);

            return Ok(new { token, refreshToken, dto.Username });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var (success, token, refreshToken, error) = await _auth.RegisterAsync(dto);
            if (!success)
                return BadRequest(error);

            return Ok(new { token, refreshToken, dto.Username });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromBody] string refreshToken)
        {
            var (success, error) = await _auth.LogoutAsync(refreshToken);
            if (!success)
                return BadRequest(error);

            return Ok(new { message = "Logged out successfully." });
        }


        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh([FromBody] string refreshToken)
        {
            var (success, newToken, newRefreshToken, error) = await _auth.RefreshAsync(refreshToken);
            if (!success)
                return Unauthorized(error);

            return Ok(new { token = newToken, refreshToken = newRefreshToken });
        }
    }

}
