using System.Security.Claims;
using backend_aspdotnet.Database;
using backend_aspdotnet.DTOs;
using backend_aspdotnet.Models;
using backend_aspdotnet.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend_aspdotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProfileController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly AppDbContext _context;

        public ProfileController(AuthService authService, AppDbContext context)
        {
            _authService = authService;
            _context = context;
        }

        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
                return NotFound("User not found.");

            var profileDto = new GetProfileInfoDto
            {
                Avatar = user.Avatar,
                Name = user.Name,
                Surname = user.Surname,
                Title = user.Title,
                Bio = user.Bio,
                Joined = user.CreatedAt,
                TotalProjects = await _context.Projects.CountAsync(p => p.UserId == userId),
                PublicProjects = await _context.Projects.CountAsync(p => p.UserId == userId && p.IsPublic),
                TotalDatasets = await _context.Datasets.CountAsync(p => p.UserId == userId),
                TotalPublicDatasets = await _context.Datasets.CountAsync(p => p.UserId == userId && p.IsPublic),

            };

            return Ok(profileDto);
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<IActionResult> SetProfile([FromBody] PutProfileInfoDto dto)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
                return NotFound("User not found.");

            if (dto.CurrentPassword != null && dto.CurrentPassword != "")
            {
                if (!_authService.ValidatePassword(dto.CurrentPassword, user.Password))
                    return BadRequest("Current password is incorrect.");
            }

            if (dto.NewPassword != null && dto.NewPassword != "")
            {
                if (dto.NewPassword != dto.ConfirmPassword)
                    return BadRequest("New password and confirm password do not match.");

            }

            await _context.Users.ForEachAsync(u =>
            {
                if (u.Id == userId)
                {
                    if (dto.Name != null && dto.Name != "")
                        u.Name = dto.Name;
                    if (dto.Surname != null && dto.Surname != "")
                        u.Surname = dto.Surname;
                    if (dto.Title != null && dto.Title != "")
                        u.Title = dto.Title;
                    if (dto.Bio != null && dto.Bio != "")
                        u.Bio = dto.Bio;
                    if (dto.Email != null && dto.Email != "")
                        u.Email = dto.Email;
                    if (dto.NewPassword != null && dto.NewPassword != "")
                        u.Password = _authService.HashPassword(dto.NewPassword);
                }
            });
            await _context.SaveChangesAsync();

            return Ok();
        }

        [Authorize]
        [HttpDelete("profile")]
        public async Task<IActionResult> DeleteProfile()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
                return NotFound("User not found.");


            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok();
        }
        

        [HttpGet("avatar")]
        public async Task<IActionResult> GetAvatars()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
                return NotFound("User not found.");

            var av = await _context.Avatars.ToListAsync();
            return Ok(av);
        }

        [Authorize]
        [HttpPut("avatar")]
        public async Task<IActionResult> SetProfile([FromBody] string avatar)
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
                return Unauthorized("User ID not found in token.");

            if (!Guid.TryParse(userIdString, out Guid userId))
                return Unauthorized("Invalid user ID format.");

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
                return NotFound("User not found.");

            await _context.Users.ForEachAsync(u =>
            {
                if (u.Id == userId)
                {
                    u.Avatar = avatar;
                }
            });
            await _context.SaveChangesAsync();

            return Ok();
        }
        

 
    }

    internal class GetProfileInfoDto
    {
        public string Avatar { get; set; }
        public string Name { get; set; }
        public string Surname { get; set; }
        public string Title { get; set; }
        public string Bio { get; set; }
        public DateTime Joined { get; set; }
        public int TotalProjects { get; set; }
        public int PublicProjects { get; set; }
        public int TotalDatasets { get; set; }
        public int TotalPublicDatasets { get; set; }

    }
        public class PutProfileInfoDto
    {
        public string Name { get; set; }
        public string Surname { get; set; }
        public string Title { get; set; }
        public string Bio { get; set; }
        public string Email { get; set; }
        public string CurrentPassword { get; set; }
        public string NewPassword { get; set; }
        public string ConfirmPassword { get; set; }
        
    }
}
