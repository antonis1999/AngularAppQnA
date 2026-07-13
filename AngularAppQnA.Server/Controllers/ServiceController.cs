using AngularAppQnA.Server.Data;
using AngularAppQnA.Server.DataContracts;
using AngularAppQnA.Server.Models;
using ClosedXML.Excel;
using Ganss.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using NPOI.OpenXmlFormats.Dml.Diagram;
using Org.BouncyCastle.Crypto.Signers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;

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
        public async Task<List<msc_Thematologia>> GetThematologies()
        {
            List<msc_Thematologia> ret = new List<msc_Thematologia>();

            DateTime dt = DateTime.Now;
            try
            {
                ret = await _context.msc_Thematologia/*.Where(x => x.FromDate <= dt && x.ToDate >= dt)*/.ToListAsync();
            }
            catch (Exception ex)
            {
                return ret;
            }

            return ret;
        }

        [HttpPost("AddThematologia")]
        [Authorize(Roles = "99")]
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

                msc_Thematologia newRow = new msc_Thematologia();
                newRow.Title = newContract.Title;
                newRow.FromDate = newContract.FromDate;
                newRow.ToDate = newContract.ToDate;
                newRow.Username = "Admin";
                newRow.CreateDate = DateTime.Now;

                _context.msc_Thematologia.Add(newRow);
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
        [Authorize(Roles = "99")]
        public async Task<BasicResponse> UpdateThematologia([FromBody] msc_Thematologia updatedContract)
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
                var existingRow = await _context.msc_Thematologia.FindAsync(updatedContract.Id);
                if (existingRow == null)
                {
                    ret.IsSuccess = false;
                    ret.Message = "Thematologia not found.";
                    return ret;
                }
                existingRow.Title = updatedContract.Title;
                existingRow.FromDate = updatedContract.FromDate;
                existingRow.ToDate = updatedContract.ToDate;
                _context.msc_Thematologia.Update(existingRow);
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

        [HttpPost("DeleteThematologia/{id}")]
        [Authorize(Roles = "99")]
        public async Task<BasicResponse> DeleteThematologia(int id)
        {
            BasicResponse ret = new BasicResponse();

            try
            {
                var row = await _context.msc_Thematologia.FindAsync(id);

                if (row == null)
                {
                    ret.IsSuccess = false;
                    ret.Message = "Thematologia not found.";
                    return ret;
                }

                var theories = await _context.msc_Thematologia_Theoria
                    .Where(x => x.DetId == id)
                    .ToListAsync();

                _context.msc_Thematologia_Theoria.RemoveRange(theories);
                _context.msc_Thematologia.Remove(row);

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
      
        public async Task<List<msc_Thematologia_Theoria>> GetTheoriaByThematologia(int thematologiaId)
        {
            try
            {
                var theoria = await _context.msc_Thematologia_Theoria
                    .Where(x => x.Id == thematologiaId)
                    .OrderBy(x => x.DetId)
                    .ToListAsync();

                return theoria;
            }
            catch (Exception)
            {
                return new List<msc_Thematologia_Theoria>();
            }
        }

        [HttpPost("AddTheoria")]
        [Authorize(Roles = "99")]
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
                var existingRow = await _context.msc_Thematologia_Theoria
                    .FirstOrDefaultAsync(x => x.Id == newContract.Id && x.DetId == newContract.DetId);

                if (existingRow != null)
                {
                    ret.IsSuccess = false;
                    ret.Message = $"Theory with ID: {newContract.Id} and DetId: {newContract.DetId} already exists.";
                    return ret;
                }

                msc_Thematologia_Theoria newRow = new msc_Thematologia_Theoria();

                newRow.Id = newContract.Id;
                newRow.DetId = newContract.DetId;
                newRow.Header = newContract.Header;
                newRow.Details = newContract.Details;
                newRow.Username = "Admin";
                newRow.CreateDate = DateTime.Now;

                _context.msc_Thematologia_Theoria.Add(newRow);
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
        [Authorize(Roles = "99")]
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

                var existingRow = await _context.msc_Thematologia_Theoria.FirstOrDefaultAsync
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

                _context.msc_Thematologia_Theoria.Update(existingRow);
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

        [HttpPost("DeleteTheoria/{id}/{detId}")]
        [Authorize(Roles = "99")]
        public async Task<BasicResponse> DeleteTheoria(int id, int detId)
        {
            BasicResponse ret = new BasicResponse();

            try
            {
                var theory = await _context.msc_Thematologia_Theoria
                  .FirstOrDefaultAsync(x => x.Id == id && x.DetId == detId);

                if (theory == null)
                {
                    ret.IsSuccess = false;
                    ret.Message = "Thematologia not found.";
                    return ret;
                }

                if (await _context.DeleteTheoriaAsync(id, detId))
                {
                    ret.IsSuccess = true;
                    ret.Message = $"Theory with ID: {id} and DetId: {detId} deleted successfully.";
                }
                else
                {
                    ret.IsSuccess = false;
                    ret.Message = "Failed to delete theory. It may have associated questions or answers.";
                }

                //_context.Thematologia_Theoria.Remove(theory);
                //await _context.SaveChangesAsync();

                //ret.IsSuccess = true;
                //ret.Message = $"Theory with ID: {id} and DetId: {detId} deleted successfully.";
            }
            catch (Exception ex)
            {
                ret.IsSuccess = false;
                ret.Message = ex.Message;
            }

            return ret;
        }
        [HttpGet("GetQuestionsByTheoria/{id}/{detId}")]
        [Authorize(Roles = "99")]
        public async Task<ActionResult<List<object>>> GetQuestionsByTheoria(int id, int detId)
        {
            try
            {
                var questions = await _context.msc_Thematologia_Question
                    .Where(q => q.Id == id && q.DetId == detId)
                    .Select(q => new
                    {
                        Id = q.Id,
                        DetId = q.DetId,
                        QId = q.QId,
                        Question = q.Question,
                        Difficulty = q.Difficulty,
                        Username = q.Username,
                        CreateDate = q.CreateDate,

                        Answers = _context.msc_Thematologia_Answers
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
        [Authorize(Roles = "99")]
        public async Task<IActionResult> SaveQuiz(SaveQnA request)
        {
            try
            {
                foreach (var q in request.Questions)
                {
                    var validAnswers = q.Answers
                        .Where(a => !string.IsNullOrWhiteSpace(a.Text))
                        .ToList();

                    if (!validAnswers.Any())
                        continue;

                    int nextQId =
                        (_context.msc_Thematologia_Question
                            .Where(x =>
                                x.Id == request.ThematologiaId &&
                                x.DetId == request.TheoriaDetId)
                            .Max(x => (int?)x.QId) ?? 0) + 1;

                    var question = new msc_Thematologia_Question
                    {
                        Id = request.ThematologiaId,
                        DetId = request.TheoriaDetId,
                        QId = nextQId,
                        Question = q.QuestionText,
                        Difficulty = q.Difficulty <= 0 ? 1 : q.Difficulty,
                        Username = "admin",
                        CreateDate = DateTime.Now
                    };

                    _context.msc_Thematologia_Question.Add(question);
                    await _context.SaveChangesAsync();

                    int nextAId =
                        (_context.msc_Thematologia_Answers
                            .Where(x =>
                                x.Id == request.ThematologiaId &&
                                x.DetId == request.TheoriaDetId &&
                                x.QId == question.QId)
                            .Max(x => (int?)x.AId) ?? 0) + 1;

                    foreach (var a in validAnswers)
                    {
                        var answer = new msc_Thematologia_Answers
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

                        _context.msc_Thematologia_Answers.Add(answer);
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
        [HttpPost("UpdateQuestion")]
        [Authorize(Roles = "99")]
        public async Task<ActionResult> UpdateQuestion([FromBody] Thematologia_UpdateQuestionRequest request)
        {
            try
            {
                var question = await _context.msc_Thematologia_Question
                    .FirstOrDefaultAsync(q =>
                        q.Id == request.Id &&
                        q.DetId == request.DetId &&
                        q.QId == request.QId);

                if (question == null)
                {
                    return NotFound(new
                    {
                        Message = "Question not found."
                    });
                }

                question.Question = request.Question;
                question.Difficulty = request.Difficulty <= 0 ? 1 : request.Difficulty;

                var oldAnswers = await _context.msc_Thematologia_Answers
                    .Where(a =>
                        a.Id == request.Id &&
                        a.DetId == request.DetId &&
                        a.QId == request.QId)
                    .ToListAsync();

                _context.msc_Thematologia_Answers.RemoveRange(oldAnswers);

                int nextAId = 1;

                foreach (var answer in request.Answers)
                {
                    _context.msc_Thematologia_Answers.Add(new msc_Thematologia_Answers
                    {
                        Id = request.Id,
                        DetId = request.DetId,
                        QId = request.QId,
                        AId = nextAId,
                        Answer = answer.Answer,
                        IsCorrect = answer.IsCorrect
                    });

                    nextAId++;
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    IsSuccess = true,
                    Message = "Question updated successfully."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Message = "An error occurred while updating question.",
                    Error = ex.Message
                });
            }
        }
        [HttpPost("DeleteQuestion/{id}/{detId}/{qId}")]
        [Authorize(Roles = "99")]
        public async Task<ActionResult> DeleteQuestion(int id, int detId, int qId)
        {
            try
            {
                var question = await _context.msc_Thematologia_Question
                    .FirstOrDefaultAsync(q =>
                        q.Id == id &&
                        q.DetId == detId &&
                        q.QId == qId);

                if (question == null)
                {
                    return NotFound(new
                    {
                        Message = "Question not found."
                    });
                }

                var answers = await _context.msc_Thematologia_Answers
                    .Where(a =>
                        a.Id == id &&
                        a.DetId == detId &&
                        a.QId == qId)
                    .ToListAsync();

                _context.msc_Thematologia_Answers.RemoveRange(answers);
                _context.msc_Thematologia_Question.Remove(question);

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    IsSuccess = true,
                    Message = "Question deleted successfully."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Message = "An error occurred while deleting question.",
                    Error = ex.Message
                });
            }
        }
        [HttpGet("GetRandomQuizQuestions/{id}")]
      
        public async Task<ActionResult> GetRandomQuizQuestions(int id)
        {
            try
            {
                var data = await _context.Set<QuizQuestionFlatDto>()
                    .FromSqlInterpolated($"EXEC msc_GetRandomQuizQuestions @ThematologiaId = {id}")
                    .ToListAsync();

                if (data == null || !data.Any())
                {
                    return NotFound(new
                    {
                        IsSuccess = false,
                        Message = "Δεν βρέθηκαν ερωτήσεις για τη θεματολογία."
                    });
                }

                var questions = data
                    .GroupBy(x => new
                    {
                        x.Id,
                        x.DetId,
                        x.QId,
                        x.Question,
                        x.Difficulty,
                        x.Details
                    })
                    .Select(g => new
                    {
                        g.Key.Id,
                        g.Key.DetId,
                        g.Key.QId,
                        g.Key.Question,
                        g.Key.Difficulty,
                        g.Key.Details,

                        Answers = g.Select(a => new
                        {
                            a.AId,
                            a.Answer,
                            a.IsCorrect
                        }).ToList()
                    })
                    .ToList();

                return Ok(questions);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    IsSuccess = false,
                    Message = ex.ToString()
                });
            }
        }

        [HttpPost("SaveQuizResult")]
        public async Task<ActionResult> SaveQuizResult([FromBody] SaveQuizResultRequest request)
        {
            try
            {
                var thematologia = await _context.msc_Thematologia
                    .FirstOrDefaultAsync(x => x.Id == request.ThematologiaId);

                decimal multiplier = 1m;
                byte quizDifficulty = 0;

                if (thematologia?.UseQuizDifficulty == true)
                {
                    quizDifficulty = (byte)thematologia.QuizDifficultyPercent;

                    multiplier = quizDifficulty switch
                    {
                        1 => 1m,
                        2 => 1.5m,
                        3 => 2m,
                        _ => 1m
                    };
                }
                else
                {
                    var answers = JsonConvert.DeserializeObject<List<QuizAnswerJsonDto>>(
                        request.AnswersJson
                    ) ?? new List<QuizAnswerJsonDto>();

                    int total = answers.Count;
                    int hard = answers.Count(x => x.Difficulty == 2);

                    decimal hardRatio = total == 0 ? 0 : (decimal)hard / total;

                    if (hardRatio <= 0.30m)
                    {
                        multiplier = 1m;
                    }
                    else if (hardRatio <= 0.60m)
                    {
                        multiplier = 1.5m;
                    }
                    else
                    {
                        multiplier = 2m;
                    }

                    quizDifficulty = 0;
                }

                decimal points = request.CorrectAnswers * multiplier;

                var result = new msc_Quiz_Results
                {
                    ThematologiaId = request.ThematologiaId,
                    UserEmail = request.UserEmail,
                    Nickname = request.Nickname,
                    TotalQuestions = request.TotalQuestions,
                    CorrectAnswers = request.CorrectAnswers,
                    WrongAnswers = request.WrongAnswers,
                    TotalTimeSeconds = request.TotalTimeSeconds,
                    AnswersJson = request.AnswersJson,
                    Points = points,
                    QuizDifficulty = quizDifficulty,
                    CreateDate = DateTime.Now
                };

                _context.msc_Quiz_Results.Add(result);

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    IsSuccess = true,
                    Message = "Quiz result saved successfully"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Message = ex.Message,
                    InnerMessage = ex.InnerException?.Message
                });
            }
        }
        [HttpGet("GetRanking/{thematologiaId}")]
        public async Task<ActionResult<List<RankingDto>>> GetRanking(int thematologiaId, int? quizDifficulty)
        {
            try
            {
                bool isAdmin = User.IsInRole("99");

                var ranking = await _context.QuizRankingDto
                    .FromSqlInterpolated($@"
                EXEC msc_GetQuizRanking 
                    @ThematologiaId = {thematologiaId},
                    @QuizDifficulty = {quizDifficulty},
                    @IsAdmin = {isAdmin}")
                    .ToListAsync();

                return Ok(ranking);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Message = ex.Message,
                    InnerMessage = ex.InnerException?.Message
                });
            }
        }
        /*[HttpPost("UpdateQuizQuestionCount")]
        public async Task<IActionResult> UpdateQuizQuestionCount(UpdateQuizQuestionCountRequest request)
        {
            if (request.QuizQuestionCount <= 0)
            {
                return BadRequest("Ο αριθμός ερωτήσεων πρέπει να είναι μεγαλύτερος από 0.");
            }

            var thematologia = await _context.Thematologia
                .FirstOrDefaultAsync(x => x.Id == request.ThematologiaId);

            if (thematologia == null)
            {
                return NotFound("Δεν βρέθηκε η θεματολογία.");
            }

            thematologia.QuizQuestionCount = request.QuizQuestionCount;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                isSuccess = true,
                message = "Η ρύθμιση αποθηκεύτηκε."
            });
        }*/
        [HttpGet("GetQuizQuestionsCount/{id}")]
        [Authorize(Roles = "99")]
        public async Task<ActionResult<int>> GetQuizQuestionsCount(int id)
        {
            try
            {
                int count = await _context.msc_Thematologia_Question
                    .CountAsync(x => x.Id == id);

                return Ok(count);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
        [HttpGet("GetUserQuizAttempts/{thematologiaId}/{nickname}")]
        [Authorize(Roles = "99")]
        public async Task<IActionResult> GetUserQuizAttempts(int thematologiaId, string nickname)
        {
            try
            {
                var thematologia = await _context.msc_Thematologia
                    .FirstOrDefaultAsync(x => x.Id == thematologiaId);

                if (thematologia == null)
                {
                    return NotFound(new
                    {
                        ThematologiaTitle = "",
                        Attempts = new List<object>()
                    });
                }

                var attempts = await _context.msc_Quiz_Results
                    .Where(x =>
                        x.ThematologiaId == thematologiaId &&
                        x.Nickname == nickname)
                    .OrderByDescending(x => x.CreateDate)
                    .Select(x => new
                    {
                        x.Nickname,
                        x.CorrectAnswers,
                        x.TotalQuestions,

                        x.Points,
                        x.QuizDifficulty,

                        QuizDifficultyLabel =
                            x.QuizDifficulty == 1 ? "Εύκολο" :
                            x.QuizDifficulty == 2 ? "Μεσαίο" :
                            x.QuizDifficulty == 3 ? "Δύσκολο" :
                            "Τυχαίο",

                        Percentage = x.TotalQuestions == 0
                            ? 0
                            : Math.Round((decimal)x.CorrectAnswers * 100 / x.TotalQuestions, 2),

                        x.TotalTimeSeconds,
                        x.CreateDate
                    })
                    .ToListAsync();

                return Ok(new
                {
                    ThematologiaTitle = thematologia.Title,
                    Attempts = attempts
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    ThematologiaTitle = "",
                    Attempts = new List<object>(),
                    Message = ex.Message
                });
            }
        }
        [HttpGet("DownloadQuizTemplate")]
        [Authorize(Roles = "99")]
        public IActionResult DownloadQuizTemplate()
        {
            using var workbook = new XLWorkbook();

            var ws = workbook.Worksheets.Add("Quiz Template");

            ws.Cell(1, 1).Value = "ΘΕΩΡΙΑ";
            ws.Cell(1, 2).Value = "ΛΕΠΤΟΜΕΡΕΙΕΣ ΘΕΩΡΙΑΣ";
            ws.Cell(1, 3).Value = "ΕΡΩΤΗΣΗ";
            ws.Cell(1, 4).Value = "ΑΠΑΝΤΗΣΕΙΣ (Διαχωρισμός με ;)";
            ws.Cell(1, 5).Value = "ΣΩΣΤΗ ΑΠΑΝΤΗΣΗ(Δήλωση με αριθμό)";
            ws.Cell(1, 6).Value = "ΒΑΘΜΟΣ ΔΥΣΚΟΛΙΑΣ(1 ή 2)";

            var header = ws.Range(1, 1, 1, 6);

            header.Style.Font.Bold = true;
            header.Style.Font.FontSize = 12;
            header.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            header.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            header.Style.Fill.BackgroundColor = XLColor.FromHtml("#D9EAF7");
            header.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            header.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

            ws.Row(1).Height = 28;

            ws.Column(1).Width = 30;
            ws.Column(2).Width = 55;
            ws.Column(3).Width = 45;
            ws.Column(4).Width = 70;
            ws.Column(5).Width = 40;
            ws.Column(6).Width = 25;
            ws.Column(2).Style.Alignment.WrapText = true;
            ws.Column(3).Style.Alignment.WrapText = true;
            ws.Column(4).Style.Alignment.WrapText = true;

            ws.SheetView.FreezeRows(1);

            var guide = workbook.Worksheets.Add("Οδηγίες");

            guide.Cell(1, 1).Value = "Οδηγίες Συμπλήρωσης Quiz Excel";
            guide.Cell(1, 1).Style.Font.Bold = true;
            guide.Cell(1, 1).Style.Font.FontSize = 16;

            guide.Cell(3, 1).Value = "1. Συμπληρώνεις τα δεδομένα στο sheet 'Quiz Template'.";
            guide.Cell(4, 1).Value = "2. Κάθε γραμμή είναι μία ερώτηση.";
            guide.Cell(5, 1).Value = "3. Οι απαντήσεις γράφονται όλες στο ίδιο κελί και χωρίζονται με ;";
            guide.Cell(6, 1).Value = "4. Η σωστή απάντηση δηλώνεται με αριθμό. Π.χ. 1 σημαίνει η πρώτη απάντηση.";
            guide.Cell(7, 1).Value = "5. Η θεματολογία δεν γράφεται στο Excel. Επιλέγεται από την εφαρμογή.";

            guide.Cell(9, 1).Value = "Παράδειγμα:";
            guide.Cell(9, 1).Style.Font.Bold = true;

            guide.Cell(11, 1).Value = "ΘΕΩΡΙΑ";
            guide.Cell(11, 2).Value = "ΛΕΠΤΟΜΕΡΕΙΕΣ ΘΕΩΡΙΑΣ";
            guide.Cell(11, 3).Value = "ΕΡΩΤΗΣΗ";
            guide.Cell(11, 4).Value = "ΑΠΑΝΤΗΣΕΙΣ (Διαχωρισμός με ;)";
            guide.Cell(11, 5).Value = "ΣΩΣΤΗ ΑΠΑΝΤΗΣΗ(Δήλωση με αριθμό)";
            guide.Cell(11, 6).Value = "ΒΑΘΜΟΣ ΔΥΣΚΟΛΙΑΣ";
            guide.Cell(12, 1).Value = "Πρόληψη";
            guide.Cell(12, 2).Value = "Οι έξοδοι κινδύνου και οι διάδρομοι διαφυγής πρέπει να είναι πάντα ελεύθεροι.";
            guide.Cell(12, 3).Value = "Ποιος είναι ο βασικός στόχος της πρόληψης στον χώρο εργασίας;";
            guide.Cell(12, 4).Value = "Η αποφυγή ατυχημάτων;Η ταχύτερη ολοκλήρωση των εργασιών;Η μείωση των διαλειμμάτων";
            guide.Cell(12, 5).Value = "1";
            guide.Cell(12, 6).Value = "1";

            var guideHeader = guide.Range(11, 1, 11, 6);
            guideHeader.Style.Font.Bold = true;
            guideHeader.Style.Fill.BackgroundColor = XLColor.FromHtml("#D9EAF7");
            guideHeader.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            guideHeader.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            guideHeader.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

            var exampleRow = guide.Range(12, 1, 12, 5);
            exampleRow.Style.Font.Italic = true;
            exampleRow.Style.Font.FontColor = XLColor.Gray;
            exampleRow.Style.Fill.BackgroundColor = XLColor.FromHtml("#F7F9FC");

            guide.Columns().AdjustToContents();
            guide.Column(2).Width = 60;
            guide.Column(3).Width = 55;
            guide.Column(4).Width = 75;
            guide.Column(6).Width = 25;
            using var stream = new MemoryStream();
            workbook.SaveAs(stream);

            return File(
                stream.ToArray(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "QuizTemplate.xlsx"
            );
        }
        [HttpPost("ImportQuizExcel/{thematologiaId}")]
        [Authorize(Roles = "99")]
        public async Task<BasicResponse> ImportQuizExcel(
            int thematologiaId,
            IFormFile file)
        {
            BasicResponse ret = new BasicResponse();
            string log = "";
            try
            {
                if (file == null || file.Length == 0)
                {
                    ret.IsSuccess = false;
                    ret.Message = "Δεν επιλέχθηκε αρχείο.";
                    return ret;
                }

                if (!Path.GetExtension(file.FileName)
                    .Equals(".xlsx", StringComparison.OrdinalIgnoreCase))
                {
                    ret.IsSuccess = false;
                    ret.Message = "Το αρχείο πρέπει να είναι .xlsx.";
                    return ret;
                }

                var thematologiaExists = await _context.msc_Thematologia
                    .AnyAsync(x => x.Id == thematologiaId);

                if (!thematologiaExists)
                {
                    ret.IsSuccess = false;
                    ret.Message = "Δεν βρέθηκε η θεματολογία.";
                    return ret;
                }

                using var stream = file.OpenReadStream();

                var mapper = new ExcelMapper(stream)
                {
                    HeaderRow = true
                };

                var rows = mapper
                     .Fetch<QuizImportRow>()
                     .Where(x =>
                        !string.IsNullOrWhiteSpace(x.Theory) ||
                        !string.IsNullOrWhiteSpace(x.TheoryDetails) ||
                        !string.IsNullOrWhiteSpace(x.Question) ||
                        !string.IsNullOrWhiteSpace(x.Answers))
                    .ToList();

                string aaa = JsonConvert.SerializeObject(rows);

                if (rows.Count > 0)
                {
                    // OK
                    List<msc_Thematologia_Theoria> theories = await _context.msc_Thematologia_Theoria
                        .Where(x => x.Id == thematologiaId).ToListAsync();



                    //List<Thematologia_Answers> answers = await _context.Thematologia_Answers.Where(x => x.Id == thematologiaId).ToListAsync();

                    foreach (QuizImportRow row in rows)
                    {
                        int detIdNew;
                        List<msc_Thematologia_Answers> answersToAdd = new List<msc_Thematologia_Answers>();

                        msc_Thematologia_Theoria theoryFound = theories.Where(x => x.Header.Trim() == row.Theory.Trim()).FirstOrDefault();
                        if (theoryFound != null)
                        {
                            detIdNew = theoryFound.DetId;
                        }
                        else
                        {
                            detIdNew = theories.Count > 0
                                ? theories.Max(x => x.DetId) + 1
                                : 1;
                            msc_Thematologia_Theoria newRow = new msc_Thematologia_Theoria()
                            {
                                Id = thematologiaId,
                                DetId = detIdNew,
                                CreateDate = DateTime.Now,
                                Username = "admin",
                                Header = row.Theory,
                                Details = row.TheoryDetails
                            };
                            _context.msc_Thematologia_Theoria.Add(newRow);
                            theories.Add(newRow);

                            theoryFound = newRow;
                        }
                        // theoria done

                        // Questions/Answers add --start

                        List<msc_Thematologia_Question> questions = await _context.msc_Thematologia_Question
                            .Where(x => x.Id == thematologiaId && x.DetId == detIdNew).ToListAsync();

                        msc_Thematologia_Question questionFound = questions.Where(x => x.DetId == theoryFound.DetId && x.Question == row.Question).FirstOrDefault();
                        if (questionFound != null)
                        {
                            log += $"question No {rows.IndexOf(row) + 1} already exists";
                            continue;
                        }
                        else
                        {
                            int qidNew = questions.Count > 0 ? questions.Max(x => x.QId + 1) : 1;
                            int difficulty = 1;
                            if (row.Difficulty == 1 || row.Difficulty == 2)
                            {
                                difficulty = row.Difficulty.Value;
                            }
                            msc_Thematologia_Question newRow = new msc_Thematologia_Question()
                            {
                                Id = thematologiaId,
                                DetId = detIdNew,
                                QId = qidNew,
                                CreateDate = DateTime.Now,
                                Username = "admin",
                                Question = row.Question,
                                Difficulty = difficulty
                            };
                            _context.msc_Thematologia_Question.Add(newRow);


                            var aa = row.Answers.Split(';', StringSplitOptions.RemoveEmptyEntries);
                            if (aa.Length < (row.CorrectAnswer))
                            {
                                log += $"Correct answer for question No {rows.IndexOf(row) + 1} is not available";
                                continue;
                            }
                            else
                            {
                                int cc = 1;
                                foreach (var answer in aa)
                                {
                                    msc_Thematologia_Answers newAnswer = new msc_Thematologia_Answers
                                    {
                                        Id = thematologiaId,
                                        DetId = detIdNew,
                                        QId = newRow.QId,
                                        AId = cc,
                                        CreateDate = DateTime.Now,
                                        Username = "admin",
                                        Answer = answer,
                                        IsCorrect = row.CorrectAnswer == cc
                                    };
                                    answersToAdd.Add(newAnswer);
                                    cc++;
                                }
                            }

                        }
                        // Questions/Answers add --end
                        if (answersToAdd.Count > 0)
                            await _context.msc_Thematologia_Answers.AddRangeAsync(answersToAdd);

                        await _context.SaveChangesAsync();
                    }


                }
                else
                {
                    ret.IsSuccess = false;
                    ret.Message += "Δεν βρέθηκαν εγγραφές";
                    return ret;
                }



                if (!rows.Any())
                {
                    ret.IsSuccess = false;
                    ret.Message += "Το Excel δεν περιέχει δεδομένα.";
                    return ret;
                }

                //var errors = new List<string>();

                //for (int i = 0; i < rows.Count; i++)
                //{
                //    var row = rows[i];
                //    int excelRowNumber = i + 2;

                //    if (string.IsNullOrWhiteSpace(row.Theory))
                //    {
                //        errors.Add($"Γραμμή {excelRowNumber}: Λείπει η θεωρία.");
                //    }

                //    if (string.IsNullOrWhiteSpace(row.TheoryDetails))
                //    {
                //        errors.Add($"Γραμμή {excelRowNumber}: Λείπουν οι λεπτομέρειες θεωρίας.");
                //    }

                //    if (string.IsNullOrWhiteSpace(row.Question))
                //    {
                //        errors.Add($"Γραμμή {excelRowNumber}: Λείπει η ερώτηση.");
                //    }

                //    if (string.IsNullOrWhiteSpace(row.Answers))
                //    {
                //        errors.Add($"Γραμμή {excelRowNumber}: Λείπουν οι απαντήσεις.");
                //        continue;
                //    }

                //    var answers = row.Answers
                //        .Split(';', StringSplitOptions.RemoveEmptyEntries)
                //        .Select(x => x.Trim())
                //        .Where(x => !string.IsNullOrWhiteSpace(x))
                //        .ToList();

                //    if (answers.Count < 2)
                //    {
                //        errors.Add($"Γραμμή {excelRowNumber}: Η ερώτηση πρέπει να έχει τουλάχιστον 2 απαντήσεις.");
                //    }

                //    if (row.CorrectAnswer <= 0)
                //    {
                //        errors.Add($"Γραμμή {excelRowNumber}: Η σωστή απάντηση πρέπει να είναι αριθμός.");
                //    }
                //    else if (row.CorrectAnswer > answers.Count)
                //    {
                //        errors.Add($"Γραμμή {excelRowNumber}: Η σωστή απάντηση πρέπει να είναι από 1 έως {answers.Count}.");
                //    }
                //}

                //if (errors.Any())
                //{
                //    ret.IsSuccess = false;
                //    ret.Message += string.Join("\n", errors);
                //    return ret;
                //}

                //int nextDetId =
                //    (_context.Thematologia_Theoria
                //        .Where(x => x.Id == thematologiaId)
                //        .Max(x => (int?)x.DetId) ?? 0) + 1;

                //int insertedTheories = 0;
                //int insertedQuestions = 0;
                //int insertedAnswers = 0;

                //var theoryGroups = rows.GroupBy(x => new
                //{
                //    Theory = x.Theory.Trim(),
                //    TheoryDetails = x.TheoryDetails.Trim()
                //});

                //foreach (var theoryGroup in theoryGroups)
                //{
                //    int currentDetId = nextDetId;

                //    var theory = new Thematologia_Theoria
                //    {
                //        Id = thematologiaId,
                //        DetId = currentDetId,
                //        Header = theoryGroup.Key.Theory,
                //        Details = theoryGroup.Key.TheoryDetails,
                //        Username = "Admin",
                //        CreateDate = DateTime.Now
                //    };

                //    _context.Thematologia_Theoria.Add(theory);
                //    insertedTheories++;

                //    int nextQId = 1;

                //    foreach (var row in theoryGroup)
                //    {
                //        var question = new Thematologia_Question
                //        {
                //            Id = thematologiaId,
                //            DetId = currentDetId,
                //            QId = nextQId,
                //            Question = row.Question.Trim(),
                //            Username = "Admin",
                //            CreateDate = DateTime.Now
                //        };

                //        _context.Thematologia_Question.Add(question);
                //        insertedQuestions++;

                //        var answers = row.Answers
                //            .Split(';', StringSplitOptions.RemoveEmptyEntries)
                //            .Select(x => x.Trim())
                //            .Where(x => !string.IsNullOrWhiteSpace(x))
                //            .ToList();

                //        int nextAId = 1;

                //        for (int i = 0; i < answers.Count; i++)
                //        {
                //            var answer = new Thematologia_Answers
                //            {
                //                Id = thematologiaId,
                //                DetId = currentDetId,
                //                QId = nextQId,
                //                AId = nextAId,
                //                Answer = answers[i],
                //                IsCorrect = (i + 1) == row.CorrectAnswer,
                //                Username = "Admin",
                //                CreateDate = DateTime.Now
                //            };

                //            _context.Thematologia_Answers.Add(answer);
                //            insertedAnswers++;
                //            nextAId++;
                //        }

                //        nextQId++;
                //    }

                //    nextDetId++;
                //}

                await _context.SaveChangesAsync();
                ret.IsSuccess = true;
                //ret.Message =
                //    $"Η εισαγωγή ολοκληρώθηκε. " +
                //    $"Θεωρίες: {insertedTheories}, " +
                //    $"Ερωτήσεις: {insertedQuestions}, " +
                //    $"Απαντήσεις: {insertedAnswers}.";

                ret.Message = string.IsNullOrEmpty(log) ? ret.Message : ret.Message += log;

                return ret;
            }
            catch (Exception ex)
            {
                ret.IsSuccess = false;
                ret.Message = ex.InnerException?.Message ?? ex.Message;
                return ret;
            }
        }
  
       /* [HttpGet("GetQuizSuggestions/{thematologiaId}")]
        public async Task<ActionResult> GetQuizSuggestions(int thematologiaId)
        {
            var allQuestions = await _context.Thematologia_Question
                .Where(q => q.Id == thematologiaId)
                .ToListAsync();

            if (!allQuestions.Any())
            {
                return Ok(new
                {
                    IsSuccess = false,
                    Message = "Δεν υπάρχουν ερωτήσεις για αυτή τη θεματολογία."
                });
            }

            var suggestions = new List<object>();

            suggestions.Add(CreateSuggestion(allQuestions, 1, "Εύκολο"));
            suggestions.Add(CreateSuggestion(allQuestions, 2, "Μεσαίο"));
            suggestions.Add(CreateSuggestion(allQuestions, 3, "Δύσκολο"));

            return Ok(new
            {
                IsSuccess = true,
                Suggestions = suggestions
            });
        }*/
        [HttpPost("UpdateQuizSettings")]
        [Authorize(Roles = "99")]
        public async Task<IActionResult> UpdateQuizSettings([FromBody] UpdateQuizSettingsRequest request)
        {
            var thematologia = await _context.msc_Thematologia
                .FirstOrDefaultAsync(x => x.Id == request.ThematologiaId);

            if (thematologia == null)
            {
                return Ok(new
                {
                    IsSuccess = false,
                    Message = "Δεν βρέθηκε η θεματολογία."
                });
            }

            int totalQuestions = await _context.msc_Thematologia_Question
                .CountAsync(q => q.Id == request.ThematologiaId);

            if (request.QuizQuestionCount <= 0)
            {
                return Ok(new
                {
                    IsSuccess = false,
                    Message = "Ο αριθμός ερωτήσεων πρέπει να είναι μεγαλύτερος από 0."
                });
            }

            if (request.QuizQuestionCount > totalQuestions)
            {
                return Ok(new
                {
                    IsSuccess = false,
                    Message = $"Υπάρχουν μόνο {totalQuestions} διαθέσιμες ερωτήσεις."
                });
            }

            if (!request.UseQuizDifficulty)
            {
                thematologia.QuizQuestionCount = request.QuizQuestionCount;
                thematologia.UseQuizDifficulty = false;
                thematologia.QuizDifficultyPercent = 2;

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    IsSuccess = true,
                    Message = "Οι ρυθμίσεις quiz αποθηκεύτηκαν."
                });
            }

            int quizDifficulty = request.QuizDifficultyPercent;

            if (quizDifficulty < 1 || quizDifficulty > 3)
            {
                return Ok(new
                {
                    IsSuccess = false,
                    Message = "Επίλεξε έγκυρη δυσκολία quiz."
                });
            }
            int easyCount;
            int hardCount;

            if (quizDifficulty == 1)
            {
                easyCount = (int)Math.Floor(request.QuizQuestionCount * 0.80);
                hardCount = request.QuizQuestionCount - easyCount;
            }
            else if (quizDifficulty == 3)
            {
                easyCount = (int)Math.Floor(request.QuizQuestionCount * 0.20);
                hardCount = request.QuizQuestionCount - easyCount;
            }
            else
            {
                easyCount = (int)Math.Floor(request.QuizQuestionCount * 0.50);
                hardCount = request.QuizQuestionCount - easyCount;
            }

            int availableEasy = await _context.msc_Thematologia_Question
                .CountAsync(q => q.Id == request.ThematologiaId && q.Difficulty == 1);

            int availableHard = await _context.msc_Thematologia_Question
                .CountAsync(q => q.Id == request.ThematologiaId && q.Difficulty == 2);

            if (availableEasy < easyCount)
            {
                return Ok(new
                {
                    IsSuccess = false,
                    Message = $"Δεν υπάρχουν αρκετές εύκολες ερωτήσεις. Χρειάζονται {easyCount}, υπάρχουν {availableEasy}."
                });
            }

            if (availableHard < hardCount)
            {
                return Ok(new
                {
                    IsSuccess = false,
                    Message = $"Δεν υπάρχουν αρκετές δύσκολες ερωτήσεις. Χρειάζονται {hardCount}, υπάρχουν {availableHard}."
                });
            }

            thematologia.QuizQuestionCount = request.QuizQuestionCount;
            thematologia.UseQuizDifficulty = true;
            thematologia.QuizDifficultyPercent = quizDifficulty;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                IsSuccess = true,
                Message = "Οι ρυθμίσεις quiz αποθηκεύτηκαν."
            });
        }
        [HttpPost("AddUser")]
        [Authorize(Roles = "99")]
        public async Task<IActionResult> AddUser(AddUserRequest request)
        {
            BasicResponse ret = new();

            try
            {
                if (string.IsNullOrWhiteSpace(request.Email))
                {
                    ret.IsSuccess = false;
                    ret.Message = "Το email είναι υποχρεωτικό.";
                    return Ok(ret);
                }

                request.Email = request.Email.Trim().ToLower();

                bool exists = await _context.msc_Users
                    .AnyAsync(x => x.Email == request.Email);

                if (exists)
                {
                    ret.IsSuccess = false;
                    ret.Message = "Υπάρχει ήδη χρήστης με αυτό το email.";
                    return Ok(ret);
                }

                msc_Users user = new()
                {
                    Email = request.Email,
                    RoleId = 1,
                    IsActive = true,
                    PasswordSha256 = null,
                    Nickname = null,
                    StoreId = null,
                    CreatedAt = DateTime.Now
                };

                _context.msc_Users.Add(user);
                await _context.SaveChangesAsync();

                ret.IsSuccess = true;
                ret.Message = "Ο χρήστης δημιουργήθηκε.";

                return Ok(ret);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.ToString());
            }
        }
        [HttpPost("ChangeUserStatus")]
        [Authorize(Roles = "99")]
        public async Task<IActionResult> ChangeUserStatus(ChangeUserStatusRequest request)
        {
            BasicResponse ret = new BasicResponse();

            msc_Users? user = await _context.msc_Users
                .FirstOrDefaultAsync(x => x.Id == request.UserId);

            if (user == null)
            {
                ret.IsSuccess = false;
                ret.Message = "Ο χρήστης δεν βρέθηκε.";
                return Ok(ret);
            }

            user.IsActive = request.IsActive;

            await _context.SaveChangesAsync();

            ret.IsSuccess = true;
            ret.Message = request.IsActive
                ? "Ο χρήστης ενεργοποιήθηκε."
                : "Ο χρήστης απενεργοποιήθηκε.";

            return Ok(ret);
        }
        [HttpGet("DownloadUsersExcelTemplate")]
        [Authorize(Roles = "99")]
        public IActionResult DownloadUsersExcelTemplate()
        {
            using XLWorkbook workbook = new XLWorkbook();

            var worksheet = workbook.Worksheets.Add("Users");

            worksheet.Cell(1, 1).Value = "Email";
            worksheet.Cell(2, 1).Value = "user@masoutis.gr";

            worksheet.Column(1).Width = 35;

            worksheet.Cell(1, 1).Style.Font.Bold = true;
            worksheet.Cell(1, 1).Style.Fill.BackgroundColor = XLColor.LightGray;

            using MemoryStream stream = new MemoryStream();

            workbook.SaveAs(stream);

            byte[] content = stream.ToArray();

            return File(
                content,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "UsersImportTemplate.xlsx"
            );
        }
        [HttpPost("ImportUsersExcel")]
        [Authorize(Roles = "99")]
        public async Task<IActionResult> ImportUsersExcel(IFormFile file)
        {
            BasicResponse ret = new BasicResponse();

            if (file == null || file.Length == 0)
            {
                ret.IsSuccess = false;
                ret.Message = "Δεν επιλέχθηκε αρχείο.";
                return Ok(ret);
            }

            int inserted = 0;
            int skipped = 0;

            using var stream = file.OpenReadStream();
            using var workbook = new XLWorkbook(stream);

            var worksheet = workbook.Worksheet(1);
            var rows = worksheet.RowsUsed().Skip(1);

            foreach (var row in rows)
            {
                string email = row.Cell(1).GetString().Trim().ToLower();

                if (string.IsNullOrWhiteSpace(email))
                {
                    continue;
                }

                bool exists = await _context.msc_Users
                    .AnyAsync(x => x.Email == email);

                if (exists)
                {
                    skipped++;
                    continue;
                }

                msc_Users user = new msc_Users
                {
                    Email = email,
                    RoleId = 1,
                    IsActive = true,
                    PasswordSha256 = null,
                    Nickname = null,
                    StoreId = null,
                    CreatedAt = DateTime.Now
                };

                _context.msc_Users.Add(user);
                inserted++;
            }

            await _context.SaveChangesAsync();

            ret.IsSuccess = true;
            ret.Message = $"Η εισαγωγή ολοκληρώθηκε. Νέοι χρήστες: {inserted}, Υπάρχοντες που αγνοήθηκαν: {skipped}.";

            return Ok(ret);
        }
        
        private object CreateSuggestion(
    List<msc_Thematologia_Question> allQuestions,
    int difficulty,
    string difficultyName)
        {
            double easyPercent;

            if (difficulty == 1)
            {
                easyPercent = 0.80;
            }
            else if (difficulty == 3)
            {
                easyPercent = 0.20;
            }
            else
            {
                easyPercent = 0.50;
            }

            double hardPercent = 1 - easyPercent;

            int availableEasy = allQuestions.Count(q => q.Difficulty == 1);
            int availableHard = allQuestions.Count(q => q.Difficulty == 2);

            int maxByEasy = easyPercent > 0
                ? (int)Math.Floor(availableEasy / easyPercent)
                : 0;

            int maxByHard = hardPercent > 0
                ? (int)Math.Floor(availableHard / hardPercent)
                : 0;

            int questionCount = Math.Min(maxByEasy, maxByHard);

            if (questionCount > 20)
                questionCount = 20;

            if (questionCount <= 0)
            {
                return new
                {
                    Difficulty = difficulty,
                    DifficultyName = difficultyName,
                    QuestionCount = 0,
                    CanCreate = false,
                    Message = $"Δεν υπάρχουν αρκετές ερωτήσεις για {difficultyName.ToLower()} quiz.",
                    Questions = new List<object>()
                };
            }

            int easyCount = (int)Math.Floor(questionCount * easyPercent);
            int hardCount = questionCount - easyCount;

            var easyQuestions = allQuestions
                .Where(q => q.Difficulty == 1)
                .OrderBy(q => Guid.NewGuid())
                .Take(easyCount)
                .ToList();

            var hardQuestions = allQuestions
                .Where(q => q.Difficulty == 2)
                .OrderBy(q => Guid.NewGuid())
                .Take(hardCount)
                .ToList();

            var selectedQuestions = easyQuestions
                .Concat(hardQuestions)
                .OrderBy(q => Guid.NewGuid())
                .Select(q => new
                {
                    q.Id,
                    q.DetId,
                    q.QId,
                    q.Question,
                    q.Difficulty
                })
                .ToList();

            return new
            {
                Difficulty = difficulty,
                DifficultyName = difficultyName,
                QuestionCount = selectedQuestions.Count,
                CanCreate = selectedQuestions.Count > 0,
                Message = $"{difficultyName} quiz με {selectedQuestions.Count} ερωτήσεις.",
                Questions = selectedQuestions
            };
        }
    }
}
