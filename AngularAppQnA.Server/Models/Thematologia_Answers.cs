namespace AngularAppQnA.Server.Models
{
    public class Thematologia_Answers
    {
        public int Id { get; set; }
        public int DetId { get; set; }
        public string Answer { get; set; }
        public bool IsCorrect { get; set; }
        public string Username { get; set; }
        public DateTime CreateDate { get; set; }
    }
}
