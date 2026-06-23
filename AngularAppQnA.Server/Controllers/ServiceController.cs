using AngularAppQnA.Server.Data;
using AngularAppQnA.Server.DataContracts;
using AngularAppQnA.Server.Models;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ganss.Excel;
using System.Text.Json.Serialization;
using System.Text.Json;
using Newtonsoft.Json;
using Org.BouncyCastle.Crypto.Signers;
using NPOI.OpenXmlFormats.Dml.Diagram;

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
                        Difficulty = q.Difficulty,
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
                    var validAnswers = q.Answers
                        .Where(a => !string.IsNullOrWhiteSpace(a.Text))
                        .ToList();

                    if (!validAnswers.Any())
                        continue;

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
                        Difficulty = q.Difficulty <= 0 ? 1 : q.Difficulty,
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

                    foreach (var a in validAnswers)
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
        [HttpPost("UpdateQuestion")]
        public async Task<ActionResult> UpdateQuestion([FromBody] Thematologia_UpdateQuestionRequest request)
        {
            try
            {
                var question = await _context.Thematologia_Question
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

                var oldAnswers = await _context.Thematologia_Answers
                    .Where(a =>
                        a.Id == request.Id &&
                        a.DetId == request.DetId &&
                        a.QId == request.QId)
                    .ToListAsync();

                _context.Thematologia_Answers.RemoveRange(oldAnswers);

                int nextAId = 1;

                foreach (var answer in request.Answers)
                {
                    _context.Thematologia_Answers.Add(new Thematologia_Answers
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
        [HttpDelete("DeleteQuestion/{id}/{detId}/{qId}")]
        public async Task<ActionResult> DeleteQuestion(int id, int detId, int qId)
        {
            try
            {
                var question = await _context.Thematologia_Question
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

                var answers = await _context.Thematologia_Answers
                    .Where(a =>
                        a.Id == id &&
                        a.DetId == detId &&
                        a.QId == qId)
                    .ToListAsync();

                _context.Thematologia_Answers.RemoveRange(answers);
                _context.Thematologia_Question.Remove(question);

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
                var thematologia = await _context.Thematologia
                    .FirstOrDefaultAsync(x => x.Id == id);

                if (thematologia == null)
                {
                    return NotFound(new
                    {
                        IsSuccess = false,
                        Message = "Δεν βρέθηκε η θεματολογία."
                    });
                }

                int questionCount = thematologia.QuizQuestionCount;
                int quizDifficulty = thematologia.QuizDifficultyPercent;
                int easyCount;
                int mediumCount;
                int hardCount;

                if (quizDifficulty == 1)
                {
                    easyCount = (int)Math.Round(questionCount * 0.70);
                    mediumCount = (int)Math.Round(questionCount * 0.20);
                    hardCount = questionCount - easyCount - mediumCount;
                }
                else if (quizDifficulty == 3)
                {
                    easyCount = (int)Math.Round(questionCount * 0.10);
                    mediumCount = (int)Math.Round(questionCount * 0.20);
                    hardCount = questionCount - easyCount - mediumCount;
                }
                else
                {
                    easyCount = (int)Math.Round(questionCount * 0.20);
                    mediumCount = (int)Math.Round(questionCount * 0.60);
                    hardCount = questionCount - easyCount - mediumCount;
                }

                var easyQuestions = await _context.Thematologia_Question
                    .Where(q => q.Id == id && q.Difficulty == 1)
                    .OrderBy(q => Guid.NewGuid())
                    .Take(easyCount)
                    .ToListAsync();

                var mediumQuestions = await _context.Thematologia_Question
                    .Where(q => q.Id == id && q.Difficulty == 2)
                    .OrderBy(q => Guid.NewGuid())
                    .Take(mediumCount)
                    .ToListAsync();

                var hardQuestions = await _context.Thematologia_Question
                    .Where(q => q.Id == id && q.Difficulty == 3)
                    .OrderBy(q => Guid.NewGuid())
                    .Take(hardCount)
                    .ToListAsync();

                var selectedQuestions = easyQuestions
                    .Concat(mediumQuestions)
                    .Concat(hardQuestions)
                    .OrderBy(q => Guid.NewGuid())
                    .ToList();

                var questions = selectedQuestions
                    .Select(q => new
                    {
                        q.Id,
                        q.DetId,
                        q.QId,
                        q.Question,
                        q.Difficulty,

                        Details = _context.Thematologia_Theoria
                            .Where(t => t.Id == q.Id && t.DetId == q.DetId)
                            .Select(t => t.Details)
                            .FirstOrDefault(),

                        Answers = _context.Thematologia_Answers
                            .Where(a =>
                                a.Id == q.Id &&
                                a.DetId == q.DetId &&
                                a.QId == q.QId)
                            .Select(a => new
                            {
                                a.AId,
                                a.Answer,
                                a.IsCorrect
                            })
                            .ToList()
                    })
                    .ToList();

                return Ok(questions);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    IsSuccess = false,
                    Message = ex.Message
                });
            }
        }
        [HttpPost("SaveQuizResult")]
        public async Task<ActionResult> SaveQuizResult(
            [FromBody] SaveQuizResultRequest request)
        {
            try
            {
                var result = new Quiz_Result
                {
                    ThematologiaId = request.ThematologiaId,
                    UserEmail = request.UserEmail,
                    Nickname = request.Nickname,
                    TotalQuestions = request.TotalQuestions,
                    CorrectAnswers = request.CorrectAnswers,
                    WrongAnswers = request.WrongAnswers,
                    TotalTimeSeconds = request.TotalTimeSeconds,
                    AnswersJson = request.AnswersJson,
                    CreateDate = DateTime.Now
                };

                _context.Quiz_Results.Add(result);

                await _context.SaveChangesAsync();

                return Ok();
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
        [HttpGet("GetRanking/{thematologiaId}")]
        public async Task<ActionResult<List<RankingDto>>> GetRanking(int thematologiaId)
        {
            try
            {
                var ranking = await _context.QuizRankingDto
                    .FromSqlInterpolated($"EXEC GetQuizRanking {thematologiaId}")
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
        [HttpPost("UpdateQuizQuestionCount")]
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
        }
        [HttpGet("GetQuizQuestionsCount/{id}")]
        public async Task<ActionResult<int>> GetQuizQuestionsCount(int id)
        {
            try
            {
                int count = await _context.Thematologia_Question
                    .CountAsync(x => x.Id == id);

                return Ok(count);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
        [HttpGet("GetUserQuizAttempts/{thematologiaId}/{nickname}")]
        public async Task<IActionResult> GetUserQuizAttempts(int thematologiaId, string nickname)
        {
            try
            {
                var thematologia = await _context.Thematologia
                    .FirstOrDefaultAsync(x => x.Id == thematologiaId);

                if (thematologia == null)
                {
                    return NotFound(new
                    {
                        ThematologiaTitle = "",
                        Attempts = new List<object>()
                    });
                }

                var attempts = await _context.Quiz_Results
                    .Where(x =>
                        x.ThematologiaId == thematologiaId &&
                        x.Nickname == nickname)
                    .OrderByDescending(x => x.CreateDate)
                    .Select(x => new
                    {
                        x.Nickname,
                        x.CorrectAnswers,
                        x.TotalQuestions,
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
        public IActionResult DownloadQuizTemplate()
        {
            using var workbook = new XLWorkbook();

            var ws = workbook.Worksheets.Add("Quiz Template");

            ws.Cell(1, 1).Value = "ΘΕΩΡΙΑ";
            ws.Cell(1, 2).Value = "ΛΕΠΤΟΜΕΡΕΙΕΣ ΘΕΩΡΙΑΣ";
            ws.Cell(1, 3).Value = "ΕΡΩΤΗΣΗ";
            ws.Cell(1, 4).Value = "ΑΠΑΝΤΗΣΕΙΣ (Διαχωρισμός με ;)";
            ws.Cell(1, 5).Value = "ΣΩΣΤΗ ΑΠΑΝΤΗΣΗ(Δήλωση με αριθμό)";
            ws.Cell(1, 6).Value = "ΒΑΘΜΟΣ ΔΥΣΚΟΛΙΑΣ";

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

                var thematologiaExists = await _context.Thematologia
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
                    List<Thematologia_Theoria> theories = await _context.Thematologia_Theoria
                        .Where(x => x.Id == thematologiaId).ToListAsync();



                    //List<Thematologia_Answers> answers = await _context.Thematologia_Answers.Where(x => x.Id == thematologiaId).ToListAsync();

                    foreach (QuizImportRow row in rows)
                    {
                        int detIdNew;
                        List<Thematologia_Answers> answersToAdd = new List<Thematologia_Answers>();

                        Thematologia_Theoria theoryFound = theories.Where(x => x.Header.Trim() == row.Theory.Trim()).FirstOrDefault();
                        if (theoryFound != null)
                        {
                            detIdNew = theoryFound.DetId;
                        }
                        else
                        {
                            detIdNew = theories.Count > 0
                                ? theories.Max(x => x.DetId) + 1
                                : 1;
                            Thematologia_Theoria newRow = new Thematologia_Theoria()
                            {
                                Id = thematologiaId,
                                DetId = detIdNew,
                                CreateDate = DateTime.Now,
                                Username = "admin",
                                Header = row.Theory,
                                Details = row.TheoryDetails
                            };
                            _context.Thematologia_Theoria.Add(newRow);
                            theories.Add(newRow);

                            theoryFound = newRow;
                        }
                        // theoria done

                        // Questions/Answers add --start

                        List<Thematologia_Question> questions = await _context.Thematologia_Question
                            .Where(x => x.Id == thematologiaId && x.DetId == detIdNew).ToListAsync();

                        Thematologia_Question questionFound = questions.Where(x => x.DetId == theoryFound.DetId && x.Question == row.Question).FirstOrDefault();
                        if (questionFound != null)
                        {
                            log += $"question No {rows.IndexOf(row) + 1} already exists";
                            continue;
                        }
                        else
                        {
                            int qidNew = questions.Count > 0 ? questions.Max(x => x.QId + 1) : 1;
                            Thematologia_Question newRow = new Thematologia_Question()
                            {
                                Id = thematologiaId,
                                DetId = detIdNew,
                                QId = qidNew,
                                CreateDate = DateTime.Now,
                                Username = "admin",
                                Question = row.Question,
                                Difficulty =                                       
                                row.Difficulty is >= 1 and <= 3
                                ? row.Difficulty.Value                                
                                : 2
                            };
                            _context.Thematologia_Question.Add(newRow);


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
                                    Thematologia_Answers newAnswer = new Thematologia_Answers
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
                            await _context.Thematologia_Answers.AddRangeAsync(answersToAdd);

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
        [HttpPost("UpdateQuizDifficulty")]
        public async Task<IActionResult> UpdateQuizDifficulty([FromBody] UpdateQuizDifficultyRequest request)
        {
            var thematologia = await _context.Thematologia
                .FirstOrDefaultAsync(x => x.Id == request.ThematologiaId);

            if (thematologia == null)
                return NotFound(new { IsSuccess = false, Message = "Δεν βρέθηκε η θεματολογία." });

            thematologia.QuizDifficultyPercent = request.QuizDifficultyPercent;

            await _context.SaveChangesAsync();

            return Ok(new { IsSuccess = true, Message = "Η δυσκολία quiz αποθηκεύτηκε." });
        }
    }
}
