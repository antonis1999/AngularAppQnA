namespace AngularAppQnA.Server.DataContracts
{
    public class Thematologia_TheoriaRequest
    {
        public int Id { get; set; }
        public int DetId { get; set; }
        public string? Header { get; set; }
        public string? Details { get; set; }
        public DateTime? CreateDate { get; set; }

    }
}
