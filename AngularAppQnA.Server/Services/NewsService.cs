
using AngularAppQnA.Server.Models;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace AngularAppQnA.Server.Services
{
    public class NewsService : INewsService
    {
        private readonly HttpClient _httpClient;

        private const string Uid =
            "f0c71c70-ef92-44a0-9cdf-91096986180a";

        private const string Secret =
            "94063140100584490";

        public NewsService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        private async Task<List<T>> GetNewsAsync<T>(
            string endpoint,
            NewsDataContract? contract = null)
        {
            string usl = DateTime.Now.ToString(
                "yyyy-MM-dd HH:mm:ss");

            string key = sha256(Secret + usl);

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                endpoint);

            request.Headers.Add("Uid", Uid);
            request.Headers.Add("Usl", usl);
            request.Headers.Add("Key", key);

            request.Content = JsonContent.Create(
                contract ?? new NewsDataContract());

            using var response =
                await _httpClient.SendAsync(request);

            response.EnsureSuccessStatusCode();

            return await response.Content
                .ReadFromJsonAsync<List<T>>()
                ?? new List<T>();
        }

        public Task<List<NewsDataContract>> GetAllNewsAsync()
        {
            return GetNewsAsync<NewsDataContract>(
                "GetAllNews");
        }

        public Task<List<NewsDataContract>> GetLastNewsAsync()
        {
            return GetNewsAsync<NewsDataContract>(
                "GetLastNews");
        }

        public Task<List<NewsDataContract>> GetInterNewsAsync()
        {
            return GetNewsAsync<NewsDataContract>(
                "GetInterNews");
        }

        public Task<List<NewsDataContract>> GetEkeMonthNewsAsync(
            string insertdate)
        {
            return GetNewsAsync<NewsDataContract>(
                "GetEkeMonthNews",
                new NewsDataContract
                {
                    insertdate = insertdate
                });
        }

        public Task<List<NewsDataContract>> GetEkePerCategoryAsync(
            string insertdate)
        {
            return GetNewsAsync<NewsDataContract>(
                "GetEkePerCategory",
                new NewsDataContract
                {
                    insertdate = insertdate
                });
        }

        public Task<List<ShowMonthEke>> GetEkeCalendarAsync(
            string insertdate)
        {
            return GetNewsAsync<ShowMonthEke>(
                "GetEkeCalendar",
                new NewsDataContract
                {
                    insertdate = insertdate
                });
        }

        public async Task<MasPortalNewsResponse> GetMasPortalNewsAsync(
            int page,
            int pageSize,
            string? searchTerm)
        {
            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                "https://portal.masoutis.gr/api/MasPortal/GetAllNews");

            request.Content = JsonContent.Create(
                new MasPortalNewsRequest
                {
                    Page = page,
                    PageSize = pageSize,
                    SearchTerm = searchTerm
                });

            using var response =
                await _httpClient.SendAsync(request);

            response.EnsureSuccessStatusCode();

            return await response.Content
                .ReadFromJsonAsync<MasPortalNewsResponse>(
                    new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    })
                ?? new MasPortalNewsResponse();
        }

        public async Task<NewsDetailsDataContract?>
            GetItemNewsAsync(int id)
        {
            string usl = DateTime.Now.ToString(
                "yyyy-MM-dd HH:mm:ss");

            string key = sha256(Secret + usl);

            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                "GetItemNews");

            request.Headers.Add("Uid", Uid);
            request.Headers.Add("Usl", usl);
            request.Headers.Add("Key", key);

            request.Content = JsonContent.Create(
                new NewsDetailsDataContract
                {
                    Id = id
                });

            using var response =
                await _httpClient.SendAsync(request);

            response.EnsureSuccessStatusCode();

            return await response.Content
                .ReadFromJsonAsync<NewsDetailsDataContract>(
                    new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
        }

        public async Task<MasPortalNewsDetailsResponse?>
            GetMasPortalNewsByIdAsync(
                int id,
                string? userEmail)
        {
            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                "https://portal.masoutis.gr/api/MasPortal/GetNewById");

            request.Content = JsonContent.Create(
                new MasPortalGetNewsRequest
                {
                    Id = id,
                    UserEmail = userEmail
                });

            using var response =
                await _httpClient.SendAsync(request);

            response.EnsureSuccessStatusCode();

            return await response.Content
                .ReadFromJsonAsync<MasPortalNewsDetailsResponse>(
                    new JsonSerializerOptions
                    {
                        PropertyNameCaseInsensitive = true
                    });
        }

        private static string sha256(string randomString)
        {
            using var crypt = SHA256.Create();
            var hash = new StringBuilder();

            byte[] crypto = crypt.ComputeHash(
                Encoding.UTF8.GetBytes(randomString));

            foreach (byte theByte in crypto)
            {
                hash.Append(theByte.ToString("x2"));
            }

            return hash.ToString();
        }
    }
}
