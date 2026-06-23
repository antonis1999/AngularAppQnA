using AngularAppQnA.Server.Models;
using DocumentFormat.OpenXml.Drawing.Charts;
using Microsoft.Data.SqlClient;
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
        public DbSet<Thematologia_Theoria> Thematologia_Theoria { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<TrainingStore> Stores { get; set; }

        public DbSet<Thematologia_Question> Thematologia_Question { get; set; }

        public DbSet<Thematologia_Answers> Thematologia_Answers { get; set; }

        public DbSet<Quiz_Result> Quiz_Results { get; set; }

        public virtual DbSet<DeleteTheoria_Result> DeleteTheoria_Results { get; set; }
        public virtual DbSet<RankingDto> QuizRankingDto { get; set; }



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
                .ToTable("Thematologia")
                .HasKey(x => x.Id);

            modelBuilder.Entity<Thematologia_Theoria>()
                .ToTable("Thematologia_Theoria")
                .HasKey(x => new { x.Id, x.DetId });

            modelBuilder.Entity<Thematologia_Question>()
                .ToTable("Thematologia_Question")
                .HasKey(x => new { x.Id, x.DetId, x.QId });

            modelBuilder.Entity<Thematologia_Answers>()
                .ToTable("Thematologia_answer")
                .HasKey(x => new { x.Id, x.DetId, x.QId, x.AId });

            modelBuilder.Entity<DeleteTheoria_Result>()
                .ToTable("DeleteTheoria_Result")
                .HasKey(x => x.Result);

            modelBuilder.Entity<RankingDto>()
                .HasNoKey();
        }

        public async Task<bool> DeleteTheoriaAsync(int id, int detid)
        {
            var idParam = new SqlParameter("@id", id);
            var detIdParam = new SqlParameter("@detid", detid);
            var answer = await this.DeleteTheoria_Results
                .FromSqlRaw("EXEC dbo.DeleteTheoria @id, @detid", idParam, detIdParam)
                .FirstOrDefaultAsync();
            return answer.Result;
        }
    }
}