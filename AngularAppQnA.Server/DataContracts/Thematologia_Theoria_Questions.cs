namespace AngularAppQnA.Server.DataContracts
{
    public class Thematologia_Theoria_Question
    {
        public int Id { get; set; }
        public int DetId { get; set; }
        public int QId { get; set; }
        public string? Question { get; set; }
        public string? Username { get; set; }
        public DateTime? CreateDate { get; set; }

    }
}
