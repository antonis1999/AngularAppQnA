
namespace AngularAppQnA.Server.Models
{
    public class MasPortalNewsResponse
    {
        public List<MasPortalNewsDto> Items { get; set; } = new();

        public int TotalCount { get; set; }

        public int Page { get; set; }

        public int PageSize { get; set; }

        public int MaxPages { get; set; }
    }
}
