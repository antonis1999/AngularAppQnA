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


        [HttpGet("GetTheoriaByThematologia")]
        public async Task<List<Thematologia_Theoria>> GetTheoriaByThematologia(int thematologiaId)
        {
            try
            {
                var theoria = await _context.Thematologia_Theoria
                    .Where(x => x.Id == thematologiaId)
                    .OrderBy(x => x.DetId)
                    .ToListAsync();

                return theoria;
            }
            catch (Exception)
            {
                return new List<Thematologia_Theoria>();
            }
        }

        [HttpPost("AddTheoria")]
        public async Task<BasicResponse> AddTheoria([FromBody] Thematologia_TheoriaRequest newContract)
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

                // filtering για να δω αν υπαρχει ήδη η θεωρια με αυτό το Id και το DetId
                var existingRow = await _context.Thematologia_Theoria
                    .FirstOrDefaultAsync(x => x.Id == newContract.Id && x.DetId == newContract.DetId);

                if (existingRow != null)
                {
                    ret.IsSuccess = false;
                    ret.Message = $"Theory with ID: {newContract.Id} and DetId: {newContract.DetId} already exists.";
                    return ret;
                }

                Thematologia_Theoria newRow = new Thematologia_Theoria();

                newRow.Id = newContract.Id;
                newRow.DetId = newContract.DetId;
                newRow.Header = newContract.Header;
                newRow.Details = newContract.Details;
                newRow.Username = "Admin";
                newRow.CreateDate = DateTime.Now;

                _context.Thematologia_Theoria.Add(newRow);
                await _context.SaveChangesAsync();

                ret.IsSuccess = true;
                ret.Message = $"New theory added with ID: {newRow.Id} and DetId: {newRow.DetId}";
            }
            catch (Exception ex)
            {
                ret.IsSuccess = false;
                ret.Message += ex.Message;
            }

            return ret;
        }

        [HttpPost("UpdateTheoria")]
        public async Task<BasicResponse> UpdateTheoria([FromBody] Thematologia_TheoriaRequest updatedContract)
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

                var existingRow = await _context.Thematologia_Theoria.FirstOrDefaultAsync
                                  (x => x.Id == updatedContract.Id && x.DetId == updatedContract.DetId);

                if (existingRow == null)
                {
                    ret.IsSuccess = false;
                    ret.Message = "Thematologia not found.";
                    return ret;
                }
                existingRow.Header = updatedContract.Header;
                existingRow.Details = updatedContract.Details;
                existingRow.CreateDate = updatedContract.CreateDate ?? existingRow.CreateDate;

                _context.Thematologia_Theoria.Update(existingRow);
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
