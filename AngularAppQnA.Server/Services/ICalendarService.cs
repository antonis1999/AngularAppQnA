using AngularAppQnA.Server.Models;

namespace AngularAppQnA.Server.Services
{
    public interface ICalendarService
    {
        Task<List<CalendarEvent>> GetEventsAsync(int year);
        Task<CalendarEvent> AddEventAsync(CalendarEvent calendarEvent);
        Task<bool> DeleteEventAsync(int id);
    }
}