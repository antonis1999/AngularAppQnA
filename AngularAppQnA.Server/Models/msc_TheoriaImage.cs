namespace AngularAppQnA.Server.Models
{
    public class msc_TheoriaImage
    {
        public int Id { get; set; }

        public int ThematologiaId { get; set; }

        public int TheoryDetId { get; set; }

        public string ImageUrl { get; set; } = string.Empty;

        public string? BlobName { get; set; }

        public int? ImageWidth { get; set; }

        public int? ImageHeight { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}