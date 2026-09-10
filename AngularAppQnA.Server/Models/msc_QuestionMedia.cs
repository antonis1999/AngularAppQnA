namespace AngularAppQnA.Server.Models
{
    public class msc_QuestionMedia
    {
        public int Id { get; set; }

        public int ThematologiaId { get; set; }

        public int TheoryDetId { get; set; }

        public int QId { get; set; }

        public string MediaUrl { get; set; } = string.Empty;

        public string? BlobName { get; set; }

        public string MediaType { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; }
    }
}