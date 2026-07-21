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


        public DbSet<msc_Thematologia> msc_Thematologia { get; set; }
        public DbSet<msc_Thematologia_Theoria> msc_Thematologia_Theoria { get; set; }
        public DbSet<msc_Users> msc_Users { get; set; }
        public DbSet<msc_Roles> msc_Roles { get; set; }
        public DbSet<msc_Stores> msc_Stores { get; set; }

        public DbSet<msc_Thematologia_Question> msc_Thematologia_Question { get; set; }

        public DbSet<msc_Thematologia_Answers> msc_Thematologia_Answers { get; set; }

        public DbSet<msc_Quiz_Results> msc_Quiz_Results { get; set; }

        public virtual DbSet<DeleteTheoria_Result> DeleteTheoria_Results { get; set; }
        public virtual DbSet<RankingDto> QuizRankingDto { get; set; }
        public virtual DbSet<QuizQuestionFlatDto> QuizQuestionFlatDto { get; set; }
        public DbSet<msc_PasswordResetToken> msc_PasswordResetTokens { get; set; }
        public DbSet<msc_AuditLog> msc_AuditLog { get; set; }



        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<msc_Users>()
                .ToTable("msc_Users")
                .HasKey(x => x.Id);

            modelBuilder.Entity<msc_Roles>()
                .ToTable("msc_Roles")
                .HasKey(x => x.Id);

            modelBuilder.Entity<msc_Stores>()
                .ToTable("msc_stores")
                .HasKey(x => x.Id);

            modelBuilder.Entity<msc_Thematologia>().ToTable("msc_Thematologia").HasKey(x => x.Id);

            modelBuilder.Entity<msc_Thematologia_Theoria>()
                .ToTable("msc_Thematologia_Theoria")
                .HasKey(x => new { x.Id, x.DetId });

            modelBuilder.Entity<msc_Thematologia_Question>()
                .ToTable("msc_Thematologia_question")
                .HasKey(x => new { x.Id, x.DetId, x.QId });

            modelBuilder.Entity<msc_Thematologia_Answers>()
                .ToTable("msc_Thematologia_answer")
                .HasKey(x => new { x.Id, x.DetId, x.QId, x.AId });

            modelBuilder.Entity<DeleteTheoria_Result>()
                .ToTable("DeleteTheoria_Result")
                .HasKey(x => x.Result);

            modelBuilder.Entity<RankingDto>()
                .HasNoKey();

            modelBuilder.Entity<QuizQuestionFlatDto>()
                .HasNoKey();

            modelBuilder.Entity<msc_Quiz_Results>()
                .ToTable("msc_Quiz_Results");
        }


        public async Task<bool> DeleteTheoriaAsync(int id, int detid)
        {
            var idParam = new SqlParameter("@id", id);
            var detIdParam = new SqlParameter("@detid", detid);

            var results = await this.DeleteTheoria_Results
                .FromSqlRaw("EXEC msc_DeleteTheoria @id, @detid", idParam, detIdParam)
                .ToListAsync();

            var answer = results.FirstOrDefault();

            return answer?.Result ?? false;
        }
    }
}