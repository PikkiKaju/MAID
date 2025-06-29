using backend_aspdotnet.Models;
using Microsoft.EntityFrameworkCore;

namespace backend_aspdotnet.Database
{
    public class AppDbContext : DbContext
    {
        public DbSet<DatasetMeta> Datasets { get; set; }
        public DbSet<ProjectMeta> Projects { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Blocked> Blocked { get; set; }
        public DbSet<Like> Likes { get; set; }



        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        // Optional: configure schema/model if needed
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            // e.g., modelBuilder.Entity<Element>().ToTable("elements");
        }
    }
}
