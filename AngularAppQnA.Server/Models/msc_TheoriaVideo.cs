namespace AngularAppQnA.Server.Models
{
    public class msc_TheoriaVideo
    {
        public int Id { get; set; }

        public int ThematologiaId { get; set; }

        public int TheoryDetId { get; set; }

        public string VideoUrl { get; set; } = string.Empty;

        public string? BlobName { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}