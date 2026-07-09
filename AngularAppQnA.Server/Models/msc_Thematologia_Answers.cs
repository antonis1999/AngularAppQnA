using System.ComponentModel.DataAnnotations.Schema;

namespace AngularAppQnA.Server.Models
{
    public class msc_Thematologia_Answers
    {
        public int Id { get; set; }
        public int DetId { get; set; }
        public int QId { get; set; }
        public int AId { get; set; }
        public string Answer { get; set; } = "";
        public bool IsCorrect { get; set; }
        public string Username { get; set; } = "";
        public DateTime CreateDate { get; set; } = DateTime.Now;
    }
}