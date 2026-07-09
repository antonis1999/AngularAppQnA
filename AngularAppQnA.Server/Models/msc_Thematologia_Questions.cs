namespace AngularAppQnA.Server.Models
{
    public class msc_Thematologia_Question
    {
        public int Id { get; set; }
        public int DetId { get; set; }
        public int QId { get; set; }
        public string Question { get; set; }
        public string? Username { get; set; }
        public int? Difficulty { get; set; }
        public DateTime CreateDate { get; set; } = DateTime.Now;
    }
}
