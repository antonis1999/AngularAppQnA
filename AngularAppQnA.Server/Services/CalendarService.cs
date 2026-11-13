using AngularAppQnA.Server.Data;
using AngularAppQnA.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace AngularAppQnA.Server.Services
{
    public class CalendarService : ICalendarService
    {
        private readonly AppDbContext _context;

        public CalendarService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<CalendarEvent>> GetEventsAsync(int year)
        {
            return await _context.CalendarEvents
                .AsNoTracking()
                .Where(e => e.EventDate.Year == year)
                .OrderBy(e => e.EventDate)
                .ThenBy(e => e.StartTime)
                .ToListAsync();
        }

        public async Task<CalendarEvent> AddEventAsync(CalendarEvent calendarEvent)
        {
            calendarEvent.Id = 0;
            calendarEvent.CreatedAt = DateTime.Now;

            _context.CalendarEvents.Add(calendarEvent);

            await _context.SaveChangesAsync();

            return calendarEvent;
        }

        public async Task<bool> DeleteEventAsync(int id)
        {
            var calendarEvent = await _context.CalendarEvents
                .FirstOrDefaultAsync(e => e.Id == id);

            if (calendarEvent == null)
                return false;

            _context.CalendarEvents.Remove(calendarEvent);

            await _context.SaveChangesAsync();

            return true;
        }
    }
}