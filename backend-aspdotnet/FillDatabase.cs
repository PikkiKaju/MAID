using backend_aspdotnet.Database;
using backend_aspdotnet.Models;
using backend_aspdotnet.Services;

namespace backend_aspdotnet
{
    public class FillDb
    {
        private readonly AppDbContext _context;
        private readonly AuthService _authService;
        public FillDb(AppDbContext db, AuthService authService)
        {
            _context = db;
            _authService = authService;
        }
        public void FillDatabase()
        {
            FillAvatars();
            FillUsers();
        }

        public void FillAvatars()
        {
            if (!_context.Avatars.Any())
            {
                string avatarsPath = Path.Combine(Directory.GetCurrentDirectory(), "StartData", "Avatars");

                if (!Directory.Exists(avatarsPath))
                {
                    Console.WriteLine($"Avatars folder not found: {avatarsPath}");
                    return;
                }

                var svgFiles = Directory.GetFiles(avatarsPath, "*.svg");
                if (svgFiles.Length == 0)
                {
                    Console.WriteLine("No SVG files found in {path}", avatarsPath);
                    return;
                }

                var avatars = svgFiles.Select(file => new Avatars
                {
                    Avatar = File.ReadAllText(file)
                }).ToList();


                _context.Avatars.AddRange(avatars);
                _context.SaveChanges();
            }
        }

        public void FillUsers()
        {
            if (!_context.Users.Any())
            {
                var count = _context.Avatars.Count();
                var random = new Random();
                var users = new List<User>
                {
                    new User { Id = Guid.NewGuid(), Username = "Admin", Email = "admin@example.com", Password = _authService.HashPassword("Admin"), Role = "Admin" },
                    new User { Id = Guid.NewGuid(), Username = "Adam", Email = "adam@gmail.com", Password = _authService.HashPassword("Adam"), Role = "User", Name="Adam",
                     Surname="Smith", Title="Data Scientist", Bio="Passionate about turning data into actionable insights.",
                     Avatar= _context.Avatars.Skip(random.Next(count)).First().Avatar },
                    new User { Id = Guid.NewGuid(), Username = "Dominik", Email = "dominik@gmail.com", Password = _authService.HashPassword("Dominik"), Role = "User", Name="Dominik",
                     Surname="Nowak", Title="Student", Bio="Eager to learn and explore the world of data science.",
                     Avatar= _context.Avatars.Skip(random.Next(count)).First().Avatar },


                };
                _context.Users.AddRange(users);
                _context.SaveChanges();
            }
        }
    }
    
}