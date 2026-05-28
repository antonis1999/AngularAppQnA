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

        [HttpDelete("DeleteThematologia/{id}")]
        public async Task<BasicResponse> DeleteThematologia(int id)
        {
            BasicResponse ret = new BasicResponse();

            try
            {
                var row = await _context.Thematologia.FindAsync(id);

                if (row == null)
                {
                    ret.IsSuccess = false;
                    ret.Message = "Thematologia not found.";
                    return ret;
                }

                var theories = await _context.Thematologia_Theoria
                    .Where(x => x.DetId == id)
                    .ToListAsync();

                _context.Thematologia_Theoria.RemoveRange(theories);
                _context.Thematologia.Remove(row);

                await _context.SaveChangesAsync();

                ret.IsSuccess = true;
                ret.Message = "Thematologia deleted.";
            }
            catch (Exception ex)
            {
                ret.IsSuccess = false;
                ret.Message = ex.Message;
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

        [HttpDelete("DeleteTheoria/{id}/{detId}")]
        public async Task<BasicResponse> DeleteTheoria(int id, int detId)
        {
            BasicResponse ret = new BasicResponse();

            try
            {
                var theory = await _context.Thematologia_Theoria
                  .FirstOrDefaultAsync(x => x.Id == id && x.DetId == detId);

                if (theory == null)
                {
                    ret.IsSuccess = false;
                    ret.Message = "Thematologia not found.";
                    return ret;
                }

                _context.Thematologia_Theoria.Remove(theory);
                await _context.SaveChangesAsync();

                ret.IsSuccess = true;
                ret.Message = $"Theory with ID: {id} and DetId: {detId} deleted successfully.";
            }
            catch (Exception ex)
            {
                ret.IsSuccess = false;
                ret.Message = ex.Message;
            }

            return ret;
        }
        [HttpGet("GetQuestionsByTheoria/{id}/{detId}")]
        public async Task<ActionResult<List<object>>> GetQuestionsByTheoria(int id, int detId)
        {
            try
            {
                var questions = await _context.Thematologia_Question
                    .Where(q => q.Id == id && q.DetId == detId)
                    .Select(q => new
                    {
                        Id = q.Id,
                        DetId = q.DetId,
                        QId = q.QId,
                        Question = q.Question,
                        Username = q.Username,
                        CreateDate = q.CreateDate,

                        Answers = _context.Thematologia_Answers
                        .Where(a => a.Id == q.Id && a.DetId == q.DetId && a.QId == q.QId)
                        .Select(a => new
                        { 
                            AId = a.AId,
                            Answer = a.Answer,
                            IsCorrect = a.IsCorrect                         
                        })                       
                        .ToList()
                    })
                    .ToListAsync();

                return Ok(questions);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Message = "An error occurred while fetching questions.",
                    Error = ex.Message
                });
            }
        }
        [HttpPost]
        [Route("SaveQnA")]
        public async Task<IActionResult> SaveQuiz(SaveQnA request)
        {
            try
            {
                foreach (var q in request.Questions)
                {
                    int nextQId =
                        (_context.Thematologia_Question
                            .Where(x =>
                                x.Id == request.ThematologiaId &&
                                x.DetId == request.TheoriaDetId)
                            .Max(x => (int?)x.QId) ?? 0) + 1;

                    var question = new Thematologia_Question
                    {
                        Id = request.ThematologiaId,
                        DetId = request.TheoriaDetId,
                        QId = nextQId,
                        Question = q.QuestionText,
                        Username = "admin",
                        CreateDate = DateTime.Now
                    };

                    _context.Thematologia_Question.Add(question);
                    await _context.SaveChangesAsync();

                    int nextAId =
                        (_context.Thematologia_Answers
                            .Where(x =>
                                x.Id == request.ThematologiaId &&
                                x.DetId == request.TheoriaDetId &&
                                x.QId == question.QId)
                            .Max(x => (int?)x.AId) ?? 0) + 1;

                    foreach (var a in q.Answers)
                    {
                        var answer = new Thematologia_Answers
                        {
                            Id = request.ThematologiaId,
                            DetId = request.TheoriaDetId,
                            QId = question.QId,
                            AId = nextAId,
                            Answer = a.Text,
                            IsCorrect = a.IsCorrect,
                            Username = "admin",
                            CreateDate = DateTime.Now
                        };

                        _context.Thematologia_Answers.Add(answer);
                        nextAId++;
                    }

                    await _context.SaveChangesAsync();
                }

                return Ok(new
                {
                    IsSuccess = true,
                    Message = "Αποθηκεύτηκε επιτυχώς"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    IsSuccess = false,
                    Message = ex.Message,
                    InnerMessage = ex.InnerException?.Message,
                    FullError = ex.ToString()
                });
            }
        }
    }
}
