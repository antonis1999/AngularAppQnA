using System.ComponentModel.DataAnnotations;

namespace AngularAppQnA.Server.Models
{
    public class msc_PasswordResetToken
    {
        [Key]
        public int Id { get; set; }

        public int UserId { get; set; }

        public Guid Token { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime ExpireDate { get; set; }

        public bool Used { get; set; }
    }
}