using Microsoft.EntityFrameworkCore;
using AngularAppQnA.Server.Models;

namespace AngularAppQnA.Server.DBContext
{
    public class MasoutisDbContext : Microsoft.EntityFrameworkCore.DbContext
    {
        public MasoutisDbContext(DbContextOptions<MasoutisDbContext> options) : base(options)
        { }

    
    }
}
