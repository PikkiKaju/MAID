using backend_aspdotnet.Database;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;

namespace backend_aspdotnet.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ElementDBConterxt _mongo;

        public AdminController(AppDbContext context, ElementDBConterxt mongo)
        {
            _context = context;
            _mongo = mongo;
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("admin-data")]
        public async Task<ActionResult> AdminGet()
        {
            var users = await _context.Users
                .Select(u => new { u.Id, u.Username })
                .ToListAsync();

            var projects = await _context.Projects
                .Select(p => new { p.Id, p.Name })
                .ToListAsync();

            var datasets = await _context.Datasets
                .Select(d => new { d.Id, d.Name })
                .ToListAsync();

            return Ok(new
            {
                Users = users,
                Projects = projects,
                Datasets = datasets
            });
        }
        [Authorize(Roles = "Admin")]
        [HttpDelete("user/{id}")]
        public async Task<IActionResult> DeleteUser(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return Ok("User deleted.");
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("project/{id}")]
        public async Task<IActionResult> DeleteProject(Guid id)
        {
            var project = await _context.Projects.FindAsync(id);
            if (project == null) return NotFound();

            _context.Projects.Remove(project);
            await _context.SaveChangesAsync();
            return Ok("Project deleted.");
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("dataset/{id}")]
        public async Task<IActionResult> DeleteDataset(Guid id)
        {
            var dataset = await _context.Datasets.FindAsync(id);
            if (dataset == null) return NotFound();

            _context.Datasets.Remove(dataset);
            await _context.SaveChangesAsync();
            return Ok("Dataset deleted.");
        }


    }
}
