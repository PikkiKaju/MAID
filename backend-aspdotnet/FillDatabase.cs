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
            FillProjectsPhotos();
        }

        public void FillProjectsPhotos()
        {
            if (!_context.ProjectPhotos.Any())
            {
                var photos = new List<ProjectPhotos>
                {
                    new ProjectPhotos { Id = Guid.NewGuid(), PhotoUrl = "https://images.unsplash.com/photo-1645839078449-124db8a049fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpZmljaWFsJTIwaW50ZWxsaWdlbmNlJTIwbmV1cmFsJTIwbmV0d29ya3xlbnwxfHx8fDE3NTk3MjU5MzJ8MA&ixlib=rb-4.1.0&q=80&w=1080" },
                    new ProjectPhotos { Id = Guid.NewGuid(), PhotoUrl = "https://images.unsplash.com/photo-1744782211816-c5224434614f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwdmlzdWFsaXphdGlvbiUyMGNoYXJ0c3xlbnwxfHx8fDE3NTk2NTI3OTJ8MA&ixlib=rb-4.1.0&q=80&w=1080" },
                    new ProjectPhotos { Id = Guid.NewGuid(), PhotoUrl = "https://images.unsplash.com/photo-1649877508777-1554357604eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21wdXRlciUyMHZpc2lvbiUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzU5NzY2MjA1fDA&ixlib=rb-4.1.0&q=80&w=1080" },
                    new ProjectPhotos { Id = Guid.NewGuid(), PhotoUrl = "https://images.unsplash.com/photo-1666875753105-c63a6f3bdc86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmFseXRpY3MlMjBkYXNoYm9hcmR8ZW58MXx8fHwxNzU5NzQwODM4fDA&ixlib=rb-4.1.0&q=80&w=1080" },
               
                };

                _context.ProjectPhotos.AddRange(photos);
                _context.SaveChanges();
            }
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