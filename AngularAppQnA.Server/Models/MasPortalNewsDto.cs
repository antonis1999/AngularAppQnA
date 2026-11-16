
namespace AngularAppQnA.Server.Models
{
    public class MasPortalNewsDto
    {
        public int Id { get; set; }

        public string? NewsHeader { get; set; }

        public string? NewsHeaderEn { get; set; }

        public string? Kategoryid { get; set; }

        public string? Image { get; set; }

        public string? Image1 { get; set; }

        public DateTime? insertdate { get; set; }

        public int TotalCount { get; set; }

        public int MaxPages { get; set; }
    }
}
