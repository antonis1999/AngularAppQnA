using AngularAppQnA.Server.Data;
using AngularAppQnA.Server.DataContracts;
using AngularAppQnA.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AngularAppQnA.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ServiceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ServiceController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("GetThematologies")]
        public async Task<List<Thematologia>> GetThematologies()
        {
            List<Thematologia> ret = new List<Thematologia>();

            DateTime dt = DateTime.Now;
            try
            {
                ret = await _context.Thematologia/*.Where(x => x.FromDate <= dt && x.ToDate >= dt)*/.ToListAsync();
            }
            catch (Exception ex)
            {
                return ret;
            }
            

            return ret;
        }

        [HttpPost("AddThematologia")]
        public async Task<BasicResponse> AddThematologia([FromBody] ThematologiaRequest newContract)
        {
            BasicResponse ret = new BasicResponse();
            try
            {
                if (newContract == null)
                {
                    ret.IsSuccess = false;
                    ret.Message = "Invalid request data.";
                    return ret;
                }

                Thematologia newRow = new Thematologia();
                newRow.Title = newContract.Title;
                newRow.FromDate = newContract.FromDate;
                newRow.ToDate = newContract.ToDate;
                newRow.Username = "Admin";
                newRow.CreateDate = DateTime.Now;

                _context.Thematologia.Add(newRow);
                await _context.SaveChangesAsync();

                ret.IsSuccess = true;
                ret.Message = $"New thematologia added with ID: {newRow.Id}";
            }
            catch (Exception ex) 
            {
                ret.IsSuccess = false;
                ret.Message += ex.Message;
            }
            return ret;

        }

        [HttpPost("UpdateThematologia")]
        public async Task<BasicResponse> UpdateThematologia([FromBody] Thematologia updatedContract)
        {
            BasicResponse ret = new BasicResponse();
            try
            {
                if (updatedContract == null || updatedContract.Id <= 0)
                {
                    ret.IsSuccess = false;
                    ret.Message = "Invalid request data.";
                    return ret;
                }
                var existingRow = await _context.Thematologia.FindAsync(updatedContract.Id);
                if (existingRow == null)
                {
                    ret.IsSuccess = false;
                    ret.Message = "Thematologia not found.";
                    return ret;
                }
                existingRow.Title = updatedContract.Title;
                existingRow.FromDate = updatedContract.FromDate;
                existingRow.ToDate = updatedContract.ToDate;
                _context.Thematologia.Update(existingRow);
                await _context.SaveChangesAsync();
                ret.IsSuccess = true;
                ret.Message = $"Thematologia with ID: {existingRow.Id} updated successfully.";
            }
            catch (Exception ex)
            {
                ret.IsSuccess = false;
                ret.Message += ex.Message;
            }
            return ret;
        }
    }
}
