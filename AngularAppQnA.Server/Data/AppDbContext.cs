using AngularAppQnA.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace AngularAppQnA.Server.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }


        public DbSet<Thematologia> Thematologia { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<TrainingStore> Stores { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>()
                .ToTable("users")
                .HasKey(x => x.Id);

            modelBuilder.Entity<Role>()
                .ToTable("roless")
                .HasKey(x => x.Id);

            modelBuilder.Entity<TrainingStore>()
                .ToTable("storess")
                .HasKey(x => x.Id);

            modelBuilder.Entity<Thematologia>()
                .HasKey(x => x.Id);
        }
    }
}