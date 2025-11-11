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
                var avatars = new List<Avatars>
                {
                new Avatars { Avatar = @"<svg xmlns=""http://www.w3.org/2000/svg"" width=""128"" height=""128"">
                    <rect width=""100%"" height=""100%"" fill=""#E3F2FD""/>
                    <circle cx=""64"" cy=""48"" r=""28"" fill=""#42A5F5""/>
                    <text x=""64"" y=""108"" font-size=""20"" text-anchor=""middle"" fill=""#0D47A1"">A</text>
                    </svg>" },
                new Avatars { Avatar = @"<svg xmlns=""http://www.w3.org/2000/svg"" width=""128"" height=""128"">
                    <rect width=""100%"" height=""100%"" fill=""#FFF3E0""/>
                    <circle cx=""64"" cy=""48"" r=""28"" fill=""#FB8C00""/>
                    <text x=""64"" y=""108"" font-size=""20"" text-anchor=""middle"" fill=""#E65100"">B</text>
                    </svg>" },
                 new Avatars { Avatar = @"<svg xmlns=""http://www.w3.org/2000/svg"" width=""128"" height=""128"">
                    <rect width=""100%"" height=""100%"" fill=""#F3E5F5""/>
                    <circle cx=""64"" cy=""48"" r=""28"" fill=""#8E24AA""/>
                    <text x=""64"" y=""108"" font-size=""20"" text-anchor=""middle"" fill=""#4A148C"">C</text>
                    </svg>" }
                };

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