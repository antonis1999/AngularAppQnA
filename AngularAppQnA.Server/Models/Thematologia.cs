using System.ComponentModel.DataAnnotations;

namespace AngularAppQnA.Server.Models
{
    public class Thematologia
    {
        [Key]
        public int Id { get; set; }
        public string Title { get; set; }
        public string Username { get; set; }
        public DateTime? CreateDate { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }
}
