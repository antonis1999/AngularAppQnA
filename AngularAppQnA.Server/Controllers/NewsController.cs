
using AngularAppQnA.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Security.Claims;

namespace AngularAppQnA.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class NewsController : ControllerBase
    {
        private readonly INewsService _newsService;

        public NewsController(INewsService newsService)
        {
            _newsService = newsService;
        }

        [HttpGet("GetAllNews")]
        public async Task<IActionResult> GetAllNews()
        {
            var news = await _newsService.GetAllNewsAsync();
            return Ok(news);
        }

        [HttpGet("GetLastNews")]
        public async Task<IActionResult> GetLastNews()
        {
            var news = await _newsService.GetLastNewsAsync();
            return Ok(news);
        }

        [HttpGet("GetInterNews")]
        public async Task<IActionResult> GetInterNews()
        {
            var news = await _newsService.GetInterNewsAsync();
            return Ok(news);
        }

        [HttpGet("GetEkeMonthNews")]
        public async Task<IActionResult> GetEkeMonthNews(
            [FromQuery] string insertdate)
        {
            var news = await _newsService
                .GetEkeMonthNewsAsync(insertdate);

            return Ok(news);
        }

        [HttpGet("GetEkePerCategory")]
        public async Task<IActionResult> GetEkePerCategory(
            [FromQuery] string insertdate)
        {
            var news = await _newsService
                .GetEkePerCategoryAsync(insertdate);

            return Ok(news);
        }

        [HttpGet("GetEkeCalendar")]
        public async Task<IActionResult> GetEkeCalendar(
            [FromQuery] string insertdate)
        {
            var calendar = await _newsService
                .GetEkeCalendarAsync(insertdate);

            return Ok(calendar);
        }

        [HttpGet("GetMasPortalNews")]
        public async Task<IActionResult> GetMasPortalNews(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? searchTerm = null)
        {
            if (page <= 0 || pageSize <= 0)
            {
                return BadRequest("Invalid paging parameters.");
            }

            var news = await _newsService
                .GetMasPortalNewsAsync(
                    page,
                    pageSize,
                    searchTerm);

            return Ok(news);
        }

        // MASOUTIS.GR - ΠΛΗΡΕΣ ΑΡΘΡΟ

        [HttpGet("GetItemNews")]
        public async Task<IActionResult> GetItemNews(
            [FromQuery] int id)
        {
            if (id <= 0)
            {
                return BadRequest("Invalid news Id.");
            }

            var news = await _newsService
                .GetItemNewsAsync(id);

            if (news == null || news.Id == 0)
            {
                return NotFound("News not found.");
            }

            return Ok(news);
        }

        // MASPORTAL - ΠΛΗΡΕΣ ΑΡΘΡΟ

        [HttpGet("GetMasPortalNewsById")]
        public async Task<IActionResult> GetMasPortalNewsById(
            [FromQuery] int id)
        {
            if (id <= 0)
            {
                return BadRequest("Invalid news Id.");
            }

            string? userEmail =
                User.FindFirst(ClaimTypes.Email)?.Value
                ?? User.FindFirst("email")?.Value
                ?? User.FindFirst("preferred_username")?.Value;

            if (string.IsNullOrWhiteSpace(userEmail))
            {
                return BadRequest(
                    "User email was not found in JWT claims.");
            }

            try
            {
                var result = await _newsService
                    .GetMasPortalNewsByIdAsync(id, userEmail);

                if (result == null ||
                    result.news == null ||
                    result.news.Length == 0)
                {
                    return NotFound("News not found.");
                }

                return Ok(result);
            }
            catch (HttpRequestException ex)
                when (ex.StatusCode == HttpStatusCode.NotFound)
            {
                return NotFound("News not found.");
            }
        }
    }
}
