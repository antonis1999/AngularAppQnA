
using AngularAppQnA.Server.Models;

namespace AngularAppQnA.Server.Services
{
    public interface INewsService
    {
        Task<List<NewsDataContract>> GetAllNewsAsync();

        Task<List<NewsDataContract>> GetLastNewsAsync();

        Task<List<NewsDataContract>> GetInterNewsAsync();

        Task<List<NewsDataContract>> GetEkeMonthNewsAsync(string insertdate);

        Task<List<NewsDataContract>> GetEkePerCategoryAsync(string insertdate);

        Task<List<ShowMonthEke>> GetEkeCalendarAsync(string insertdate);

        Task<MasPortalNewsResponse> GetMasPortalNewsAsync(
            int page,
            int pageSize,
            string? searchTerm);

        Task<NewsDetailsDataContract?> GetItemNewsAsync(int id);

        Task<MasPortalNewsDetailsResponse?> GetMasPortalNewsByIdAsync(
            int id,
            string? userEmail);
    }
}
