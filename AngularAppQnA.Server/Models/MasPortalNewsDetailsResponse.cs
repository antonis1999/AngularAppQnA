
namespace AngularAppQnA.Server.Models
{
    public class MasPortalNewsDetailsResponse
    {
        public MasPortalNews[] news { get; set; } = Array.Empty<MasPortalNews>();

        public MasPortalNewsDetails[]? newsDetails { get; set; }
    }

    public class MasPortalNews
    {
        public int Id { get; set; }
        public string? NewsHeader { get; set; }
        public string? NewsDetail { get; set; }
        public string? Kategoryid { get; set; }
        public DateTime? insertdate { get; set; }
        public int? NewsType { get; set; }
        public string? VideoLink { get; set; }
        public int? HealthId { get; set; }
        public string? Image { get; set; }
        public string? Image1 { get; set; }
        public string? Image2 { get; set; }
        public DateTime? CreateDate { get; set; }
        public bool? IfInternal { get; set; }
    }

    public class MasPortalNewsDetails
    {
        public int Id { get; set; }
        public int DetId { get; set; }
        public string? DetImage { get; set; }
    }

    public class MasPortalGetNewsRequest
    {
        public int Id { get; set; }
        public string? UserEmail { get; set; }
    }
}
