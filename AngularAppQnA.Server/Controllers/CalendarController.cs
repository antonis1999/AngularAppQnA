
using AngularAppQnA.Server.Models;
using AngularAppQnA.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace AngularAppQnA.Server.Controllers
{
    [Route("api/calendar")]
    [ApiController]
    [Authorize]
    public class CalendarController : ControllerBase
    {
        private readonly ICalendarService _calendarService;

        public CalendarController(ICalendarService calendarService)
        {
            _calendarService = calendarService;
        }

        [HttpGet("GetEvents")]
        public async Task<IActionResult> GetEvents([FromQuery] int year)
        {
            if (year < 1 || year > 9999)
                return BadRequest("Μη έγκυρο έτος.");

            var events = await _calendarService.GetEventsAsync(year);

            return Ok(events);
        }

        [HttpPost("AddEvent")]
        public async Task<IActionResult> AddEvent([FromBody] CalendarEvent calendarEvent)
        {
            if (!IsAdmin())
                return Forbid();

            if (string.IsNullOrWhiteSpace(calendarEvent.Title))
                return BadRequest("Ο τίτλος είναι υποχρεωτικός.");

            if (calendarEvent.EventDate == default)
                return BadRequest("Η ημερομηνία είναι υποχρεωτική.");

            if (calendarEvent.StartTime.HasValue &&
                calendarEvent.EndTime.HasValue &&
                calendarEvent.EndTime < calendarEvent.StartTime)
            {
                return BadRequest("Η ώρα λήξης πρέπει να είναι μετά την έναρξη.");
            }

            var result = await _calendarService.AddEventAsync(calendarEvent);

            return Ok(result);
        }

        [HttpPost("DeleteEvent")]
        public async Task<IActionResult> DeleteEvent([FromBody] int id)
        {
            if (!IsAdmin())
                return Forbid();

            var deleted = await _calendarService.DeleteEventAsync(id);

            if (!deleted)
                return NotFound("Η δραστηριότητα δεν βρέθηκε.");

            return Ok(new
            {
                Message = "Η δραστηριότητα διαγράφηκε επιτυχώς."
            });
        }

        private bool IsAdmin()
        {
            var roleId = User.FindFirst("RoleId")?.Value
                ?? User.FindFirst(ClaimTypes.Role)?.Value;

            return roleId == "99";
        }
    }
}
