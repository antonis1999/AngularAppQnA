using AngularAppQnA.Server.Data;
using AngularAppQnA.Server.DataContracts;
using AngularAppQnA.Server.Models;
using AngularAppQnA.Server.Services;
using ClosedXML.Excel;
using DocumentFormat.OpenXml.Office2016.Excel;
using DocumentFormat.OpenXml.Spreadsheet;
using Ganss.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;
using NPOI.OpenXmlFormats.Dml.Diagram;
using Org.BouncyCastle.Asn1.Ocsp;
using Org.BouncyCastle.Crypto.Signers;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;


namespace AngularAppQnA.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ServiceController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly AuditService _auditService;
        private readonly BlobStorageService _blobStorageService;

        public ServiceController(
            AppDbContext context,
            AuditService auditService,
            BlobStorageService blobStorageService)
        {
            _context = context;
            _auditService = auditService;
            _blobStorageService = blobStorageService;
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

            await using var transaction =
                await _context.Database.BeginTransactionAsync();

            try
            {
                var row = await _context.msc_Thematologia
                    .FirstOrDefaultAsync(x => x.Id == id);

                if (row == null)
                {
                    ret.IsSuccess = false;
                    ret.Message = "Η θεματολογία δεν βρέθηκε.";
                    return ret;
                }

                var theories = await _context.msc_Thematologia_Theoria
                    .Where(x => x.Id == id)
                    .ToListAsync();

                var userIdClaim = User.FindFirst(
                    System.Security.Claims.ClaimTypes.NameIdentifier
                )?.Value;

                int? userId = null;

                if (int.TryParse(userIdClaim, out int parsedUserId))
                {
                    userId = parsedUserId;
                }

                var userEmail = User.FindFirst(
                    System.Security.Claims.ClaimTypes.Email
                )?.Value;

                var audit = new msc_AuditLog
                {
                    TableName = "_Thematologia",
                    RecordId = row.Id.ToString(),
                    ActionType = "DELETE_THEMATOLOGIA",

                    OldValues =
                        System.Text.Json.JsonSerializer.Serialize(row),

                    PerformedAt = DateTime.Now,

                    Description =
                        $"Διαγράφηκε η θεματολογία '{row.Title}' με ID {row.Id}.",

                    NewValues = null,

                    PerformedByUserId = userId,
                    PerformedByEmail = userEmail
                };

                _context.msc_AuditLog.Add(audit);

                _context.msc_Thematologia_Theoria.RemoveRange(theories);
                _context.msc_Thematologia.Remove(row);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                ret.IsSuccess = true;
                ret.Message = "Η θεματολογία διαγράφηκε επιτυχώς.";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();

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

                await SyncTheoryVideos(
                    newRow.Id,
                    newRow.DetId,
                    newRow.Details
                );

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

                await SyncTheoryVideos(
                    existingRow.Id,
                    existingRow.DetId,
                    existingRow.Details
                );

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
        public async Task<BasicResponse> DeleteTheoria(
    int id,
    int detId)
        {
            BasicResponse ret = new BasicResponse();

            try
            {
                var theory = await _context.msc_Thematologia_Theoria
                    .FirstOrDefaultAsync(x =>
                        x.Id == id &&
                        x.DetId == detId);

                if (theory == null)
                {
                    ret.IsSuccess = false;
                    ret.Message = "Thematologia not found.";
                    return ret;
                }

                var theoryVideos = await _context.TheoriaVideos
                    .Where(x =>
                        x.ThematologiaId == id &&
                        x.TheoryDetId == detId)
                    .ToListAsync();

                var oldValues = new
                {
                    theory.Id,
                    theory.DetId,
                    theory.Header,
                    theory.Details
                };

                var deleted =
                    await _context.DeleteTheoriaAsync(
                        id,
                        detId
                    );

                if (!deleted)
                {
                    ret.IsSuccess = false;
                    ret.Message =
                        "Failed to delete theory. It may have associated questions or answers.";

                    return ret;
                }

                // Διαγραφή εγγραφών video από SQL
                if (theoryVideos.Count > 0)
                {
                    _context.TheoriaVideos.RemoveRange(
                        theoryVideos
                    );

                    await _context.SaveChangesAsync();
                }

                // Διαγραφή των πραγματικών video από Azure Blob Storage
                foreach (var video in theoryVideos)
                {
                    if (!string.IsNullOrWhiteSpace(video.BlobName))
                    {
                        await _blobStorageService.DeleteBlobAsync(
                            video.BlobName
                        );
                    }
                }

                await _auditService.LogAsync(
                    actionType: "DELETE_THEORIA",
                    tableName: "msc_Thematologia_Theoria",
                    recordId: $"{id}/{detId}",
                    description:
                        $"Διαγράφηκε η θεωρία '{theory.Header}'.",
                    oldValues: oldValues
                );

                ret.IsSuccess = true;
                ret.Message =
                    $"Theory with ID: {id} and DetId: {detId} deleted successfully.";
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
        public async Task<ActionResult<List<object>>> GetQuestionsByTheoria(
     int id,
     int detId)
        {
            try
            {
                var questions = await _context.msc_Thematologia_Question
                    .Where(q =>
                        q.Id == id &&
                        q.DetId == detId)
                    .Select(q => new
                    {
                        Id = q.Id,
                        DetId = q.DetId,
                        QId = q.QId,
                        Question = q.Question,
                        Difficulty = q.Difficulty,
                        QuestionType = q.QuestionType,
                        Username = q.Username,
                        CreateDate = q.CreateDate,

                        Answers = _context.msc_Thematologia_Answers
                            .Where(a =>
                                a.Id == q.Id &&
                                a.DetId == q.DetId &&
                                a.QId == q.QId)
                            .OrderBy(a => a.AId)
                            .Select(a => new
                            {
                                AId = a.AId,
                                Answer = a.Answer,
                                IsCorrect = a.IsCorrect,
                                MatchLeft = a.MatchLeft,
                                MatchRight = a.MatchRight,
                                CategoryName = a.CategoryName
                            })
                            .ToList(),

                        Media = _context.msc_QuestionMedia
                            .Where(m =>
                                m.ThematologiaId == q.Id &&
                                m.TheoryDetId == q.DetId &&
                                m.QId == q.QId)
                            .OrderBy(m => m.Id)
                            .Select(m => new
                            {
                                MediaUrl = m.MediaUrl,
                                BlobName = m.BlobName,
                                MediaType = m.MediaType
                            })
                            .ToList()
                    })
                    .OrderBy(q => q.QId)
                    .ToListAsync();

                return Ok(questions);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    IsSuccess = false,
                    Message = "An error occurred while fetching questions.",
                    Error = ex.Message,
                    InnerError = ex.InnerException?.Message
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
                        .Where(a =>
                            q.QuestionType == 4
                                ? !string.IsNullOrWhiteSpace(a.MatchLeft) &&
                                  !string.IsNullOrWhiteSpace(a.MatchRight)

                            : q.QuestionType == 5
                                ? !string.IsNullOrWhiteSpace(a.Text) &&
                                  !string.IsNullOrWhiteSpace(a.CategoryName)

                            : !string.IsNullOrWhiteSpace(a.Text)
                        )
                        .ToList();

                    if (!validAnswers.Any())
                    {
                        continue;
                    }

                    if (q.QuestionType == 3 && validAnswers.Count < 2)
                    {
                        return BadRequest(new
                        {
                            IsSuccess = false,
                            Message = "Η ερώτηση Σειρά πρέπει να έχει τουλάχιστον 2 βήματα."
                        });
                    }

                    if (q.QuestionType == 4 && validAnswers.Count < 2)
                    {
                        return BadRequest(new
                        {
                            IsSuccess = false,
                            Message = "Η ερώτηση Αντιστοίχισης πρέπει να έχει τουλάχιστον 2 ολοκληρωμένα ζευγάρια."
                        });
                    }

                    if (q.QuestionType == 5)
                    {
                        if (validAnswers.Count < 2)
                        {
                            return BadRequest(new
                            {
                                IsSuccess = false,
                                Message = "Η ερώτηση Κατηγοριοποίησης πρέπει να έχει τουλάχιστον 2 κάρτες."
                            });
                        }

                        var categoryCount = validAnswers
                            .Select(a => a.CategoryName!.Trim())
                            .Distinct(StringComparer.OrdinalIgnoreCase)
                            .Count();

                        if (categoryCount < 2)
                        {
                            return BadRequest(new
                            {
                                IsSuccess = false,
                                Message = "Η ερώτηση Κατηγοριοποίησης πρέπει να έχει τουλάχιστον 2 διαφορετικές κατηγορίες."
                            });
                        }
                    }

                    if (
                        q.QuestionType != 3 &&
                        q.QuestionType != 4 &&
                        q.QuestionType != 5 &&
                        !validAnswers.Any(a => a.IsCorrect)
                    )
                    {
                        return BadRequest(new
                        {
                            IsSuccess = false,
                            Message = "Επέλεξε έγκυρη σωστή απάντηση."
                        });
                    }

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
                        QuestionType = q.QuestionType <= 0 ? 1 : q.QuestionType,
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

                            Answer =
                                q.QuestionType == 4
                                    ? ""
                                    : a.Text.Trim(),

                            IsCorrect =
                                q.QuestionType == 3 ||
                                q.QuestionType == 4 ||
                                q.QuestionType == 5
                                    ? false
                                    : a.IsCorrect,

                            MatchLeft =
                                q.QuestionType == 4
                                    ? a.MatchLeft?.Trim()
                                    : null,

                            MatchRight =
                                q.QuestionType == 4
                                    ? a.MatchRight?.Trim()
                                    : null,

                            CategoryName =
                                q.QuestionType == 5
                                    ? a.CategoryName?.Trim()
                                    : null,

                            Username = "admin",
                            CreateDate = DateTime.Now
                        };

                        _context.msc_Thematologia_Answers.Add(answer);

                        nextAId++;
                    }

                    if (q.Media != null && q.Media.Any())
                    {
                        foreach (var mediaItem in q.Media)
                        {
                            if (string.IsNullOrWhiteSpace(mediaItem.MediaUrl))
                            {
                                continue;
                            }

                            var media = new msc_QuestionMedia
                            {
                                ThematologiaId = request.ThematologiaId,
                                TheoryDetId = request.TheoriaDetId,
                                QId = question.QId,
                                MediaUrl = mediaItem.MediaUrl,
                                BlobName = mediaItem.BlobName,
                                MediaType = mediaItem.MediaType,
                                CreatedDate = DateTime.Now
                            };

                            _context.msc_QuestionMedia.Add(media);
                        }
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
        public async Task<ActionResult> UpdateQuestion(
            [FromBody] Thematologia_UpdateQuestionRequest request)
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
                        IsSuccess = false,
                        Message = "Question not found."
                    });
                }

                var validAnswers = request.Answers
                    .Where(a =>
                        request.QuestionType == 4
                            ? !string.IsNullOrWhiteSpace(a.MatchLeft) &&
                              !string.IsNullOrWhiteSpace(a.MatchRight)

                        : request.QuestionType == 5
                            ? !string.IsNullOrWhiteSpace(a.Answer) &&
                              !string.IsNullOrWhiteSpace(a.CategoryName)

                        : !string.IsNullOrWhiteSpace(a.Answer)
                    )
                    .ToList();

                if (!validAnswers.Any())
                {
                    return BadRequest(new
                    {
                        IsSuccess = false,
                        Message = "Η ερώτηση πρέπει να έχει τουλάχιστον μία έγκυρη απάντηση."
                    });
                }

                if (request.QuestionType == 3 && validAnswers.Count < 2)
                {
                    return BadRequest(new
                    {
                        IsSuccess = false,
                        Message = "Η ερώτηση Σειρά πρέπει να έχει τουλάχιστον 2 βήματα."
                    });
                }

                if (request.QuestionType == 4 && validAnswers.Count < 2)
                {
                    return BadRequest(new
                    {
                        IsSuccess = false,
                        Message = "Η ερώτηση Αντιστοίχισης πρέπει να έχει τουλάχιστον 2 ολοκληρωμένα ζευγάρια."
                    });
                }

                if (request.QuestionType == 5)
                {
                    if (validAnswers.Count < 2)
                    {
                        return BadRequest(new
                        {
                            IsSuccess = false,
                            Message = "Η ερώτηση Κατηγοριοποίησης πρέπει να έχει τουλάχιστον 2 κάρτες."
                        });
                    }

                    var categoryCount = validAnswers
                        .Select(a => a.CategoryName!.Trim())
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .Count();

                    if (categoryCount < 2)
                    {
                        return BadRequest(new
                        {
                            IsSuccess = false,
                            Message = "Η ερώτηση Κατηγοριοποίησης πρέπει να έχει τουλάχιστον 2 διαφορετικές κατηγορίες."
                        });
                    }
                }

                if (
                    request.QuestionType != 3 &&
                    request.QuestionType != 4 &&
                    request.QuestionType != 5 &&
                    !validAnswers.Any(a => a.IsCorrect)
                )
                {
                    return BadRequest(new
                    {
                        IsSuccess = false,
                        Message = "Επέλεξε έγκυρη σωστή απάντηση."
                    });
                }

                question.Question = request.Question;
                question.QuestionType =
                    request.QuestionType <= 0
                        ? 1
                        : request.QuestionType;
                question.Difficulty =
                    request.Difficulty <= 0
                        ? 1
                        : request.Difficulty;

                var oldAnswers =
                    await _context.msc_Thematologia_Answers
                        .Where(a =>
                            a.Id == request.Id &&
                            a.DetId == request.DetId &&
                            a.QId == request.QId)
                        .ToListAsync();

                if (oldAnswers.Any())
                {
                    _context.msc_Thematologia_Answers
                        .RemoveRange(oldAnswers);
                }

                int nextAId = 1;

                foreach (var answer in validAnswers)
                {
                    var newAnswer =
                        new msc_Thematologia_Answers
                        {
                            Id = request.Id,
                            DetId = request.DetId,
                            QId = request.QId,
                            AId = nextAId,

                            Answer =
                                request.QuestionType == 4
                                    ? ""
                                    : answer.Answer.Trim(),

                            IsCorrect =
                                request.QuestionType == 3 ||
                                request.QuestionType == 4 ||
                                request.QuestionType == 5
                                    ? false
                                    : answer.IsCorrect,

                            MatchLeft =
                                request.QuestionType == 4
                                    ? answer.MatchLeft?.Trim()
                                    : null,

                            MatchRight =
                                request.QuestionType == 4
                                    ? answer.MatchRight?.Trim()
                                    : null,

                            CategoryName =
                                request.QuestionType == 5
                                    ? answer.CategoryName?.Trim()
                                    : null,

                            Username = "admin",
                            CreateDate = DateTime.Now
                        };

                    _context.msc_Thematologia_Answers
                        .Add(newAnswer);

                    nextAId++;
                }

                var oldMedia =
                    await _context.msc_QuestionMedia
                        .Where(m =>
                            m.ThematologiaId == request.Id &&
                            m.TheoryDetId == request.DetId &&
                            m.QId == request.QId)
                        .ToListAsync();

                var requestMedia =
                    request.Media ??
                    new List<UpdateQuestionMediaRequest>();

                var removedMedia =
                    oldMedia
                        .Where(old =>
                            !requestMedia.Any(current =>
                                (
                                    !string.IsNullOrWhiteSpace(old.BlobName) &&
                                    !string.IsNullOrWhiteSpace(current.BlobName) &&
                                    old.BlobName == current.BlobName
                                )
                                ||
                                old.MediaUrl == current.MediaUrl
                            )
                        )
                        .ToList();

                foreach (var removed in removedMedia)
                {
                    if (string.IsNullOrWhiteSpace(removed.BlobName))
                    {
                        continue;
                    }

                    try
                    {
                        await _blobStorageService.DeleteBlobAsync(
                            removed.BlobName
                        );
                    }
                    catch (Exception blobEx)
                    {
                        Console.WriteLine(
                            $"Blob delete failed: " +
                            $"{removed.BlobName} - " +
                            $"{blobEx.Message}"
                        );
                    }
                }

                if (oldMedia.Any())
                {
                    _context.msc_QuestionMedia
                        .RemoveRange(oldMedia);
                }

                foreach (var mediaItem in requestMedia)
                {
                    if (string.IsNullOrWhiteSpace(mediaItem.MediaUrl))
                    {
                        continue;
                    }

                    var media =
                        new msc_QuestionMedia
                        {
                            ThematologiaId = request.Id,
                            TheoryDetId = request.DetId,
                            QId = request.QId,
                            MediaUrl = mediaItem.MediaUrl,
                            BlobName = mediaItem.BlobName,
                            MediaType = mediaItem.MediaType,
                            CreatedDate = DateTime.Now
                        };

                    _context.msc_QuestionMedia.Add(media);
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
                    IsSuccess = false,
                    Message =
                        "An error occurred while updating question.",
                    Error = ex.Message,
                    InnerError =
                        ex.InnerException?.Message
                });
            }
        }

        [HttpPost("DeleteQuestion/{id}/{detId}/{qId}")]
        [Authorize(Roles = "99")]
        public async Task<ActionResult> DeleteQuestion(
            int id,
            int detId,
            int qId)
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
                        IsSuccess = false,
                        Message = "Question not found."
                    });
                }

                var answers = await _context.msc_Thematologia_Answers
                    .Where(a =>
                        a.Id == id &&
                        a.DetId == detId &&
                        a.QId == qId)
                    .ToListAsync();

                var media = await _context.msc_QuestionMedia
                    .Where(m =>
                        m.ThematologiaId == id &&
                        m.TheoryDetId == detId &&
                        m.QId == qId)
                    .ToListAsync();

                var oldValues = new
                {
                    Question = new
                    {
                        question.Id,
                        question.DetId,
                        question.QId,
                        question.Question,
                        question.Difficulty,
                        question.QuestionType
                    },

                    Answers = answers.Select(a => new
                    {
                        a.Id,
                        a.DetId,
                        a.QId,
                        a.AId,
                        a.Answer,
                        a.IsCorrect,
                        a.MatchLeft,
                        a.MatchRight,
                        a.CategoryName
                    }).ToList(),

                    Media = media.Select(m => new
                    {
                        m.Id,
                        m.ThematologiaId,
                        m.TheoryDetId,
                        m.QId,
                        m.MediaUrl,
                        m.BlobName,
                        m.MediaType
                    }).ToList()
                };

                foreach (var mediaItem in media)
                {
                    if (!string.IsNullOrWhiteSpace(mediaItem.BlobName))
                    {
                        try
                        {
                            await _blobStorageService.DeleteBlobAsync(
                                mediaItem.BlobName
                            );
                        }
                        catch (Exception blobEx)
                        {
                            Console.WriteLine(
                                $"Blob delete failed: {mediaItem.BlobName} - {blobEx.Message}"
                            );
                        }
                    }
                }

                if (answers.Any())
                {
                    _context.msc_Thematologia_Answers
                        .RemoveRange(answers);
                }

                if (media.Any())
                {
                    _context.msc_QuestionMedia
                        .RemoveRange(media);
                }

                _context.msc_Thematologia_Question
                    .Remove(question);

                await _context.SaveChangesAsync();

                await _auditService.LogAsync(
                    actionType: "DELETE_QUESTION",
                    tableName: "msc_Thematologia_Question",
                    recordId: $"{id}/{detId}/{qId}",
                    description: $"Διαγράφηκε η ερώτηση '{question.Question}'.",
                    oldValues: oldValues
                );

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
                    IsSuccess = false,
                    Message = "An error occurred while deleting question.",
                    Error = ex.Message,
                    InnerError = ex.InnerException?.Message
                });
            }
        }
        [HttpGet("GetRandomQuizQuestions/{id}")]
        public async Task<ActionResult> GetRandomQuizQuestions(int id)
        {
            try
            {
                var data = await _context.Set<QuizQuestionFlatDto>()
                    .FromSqlInterpolated(
                        $"EXEC msc_GetRandomQuizQuestions @ThematologiaId = {id}"
                    )
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
                        x.Details,
                        x.QuestionType
                    })
                    .Select(g => new
                    {
                        g.Key.Id,
                        g.Key.DetId,
                        g.Key.QId,
                        g.Key.Question,
                        g.Key.Difficulty,
                        g.Key.Details,
                        g.Key.QuestionType,

                        Answers = g
                            .OrderBy(a => a.AId)
                            .Select(a => new
                            {
                                a.AId,
                                a.Answer,
                                a.IsCorrect,
                                a.MatchLeft,
                                a.MatchRight,
                                a.CategoryName
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
            ws.Cell(1, 7).Value = "QUESTION TYPE(1-5)";
            ws.Cell(1, 8).Value = "ORDER POSITION (Διαχωρισμός με ;)";
            ws.Cell(1, 9).Value = "MATCH LEFT (Διαχωρισμός με ;)";
            ws.Cell(1, 10).Value = "MATCH RIGHT (Διαχωρισμός με ;)";
            ws.Cell(1, 11).Value = "CATEGORY NAME (Διαχωρισμός με ;)";

            var header = ws.Range(1, 1, 1, 11);

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
            ws.Column(7).Width = 22;
            ws.Column(8).Width = 38;
            ws.Column(9).Width = 55;
            ws.Column(10).Width = 55;
            ws.Column(11).Width = 45;

            ws.Column(2).Style.Alignment.WrapText = true;
            ws.Column(3).Style.Alignment.WrapText = true;
            ws.Column(4).Style.Alignment.WrapText = true;
            ws.Column(8).Style.Alignment.WrapText = true;
            ws.Column(9).Style.Alignment.WrapText = true;
            ws.Column(10).Style.Alignment.WrapText = true;
            ws.Column(11).Style.Alignment.WrapText = true;

            ws.SheetView.FreezeRows(1);

            var guide = workbook.Worksheets.Add("Οδηγίες");

            guide.Cell(1, 1).Value = "Οδηγίες Συμπλήρωσης Quiz Excel";
            guide.Cell(1, 1).Style.Font.Bold = true;
            guide.Cell(1, 1).Style.Font.FontSize = 16;

            guide.Cell(3, 1).Value = "1. Συμπληρώνεις τα δεδομένα στο sheet 'Quiz Template'.";
            guide.Cell(4, 1).Value = "2. Κάθε γραμμή είναι μία ερώτηση.";
            guide.Cell(5, 1).Value = "3. Οι στήλες που δεν αφορούν το συγκεκριμένο Question Type μένουν κενές και αγνοούνται.";
            guide.Cell(6, 1).Value = "4. Question Type: 1 = Multiple Choice, 2 = True / False, 3 = Ordering, 4 = Matching, 5 = Categorization.";
            guide.Cell(7, 1).Value = "5. Multiple Choice: χρησιμοποιεί ΑΠΑΝΤΗΣΕΙΣ και ΣΩΣΤΗ ΑΠΑΝΤΗΣΗ.";
            guide.Cell(8, 1).Value = "6. True / False: δημιουργούνται αυτόματα οι απαντήσεις Σωστό / Λάθος. ΣΩΣΤΗ ΑΠΑΝΤΗΣΗ 1 = Σωστό, 2 = Λάθος.";
            guide.Cell(9, 1).Value = "7. Ordering: ΑΠΑΝΤΗΣΕΙΣ και ORDER POSITION πρέπει να έχουν ίδιο πλήθος τιμών. Π.χ. Α;Β;Γ και 2;1;3.";
            guide.Cell(10, 1).Value = "8. Matching: MATCH LEFT και MATCH RIGHT πρέπει να έχουν ίδιο πλήθος τιμών.";
            guide.Cell(11, 1).Value = "9. Categorization: ΑΠΑΝΤΗΣΕΙΣ και CATEGORY NAME πρέπει να έχουν ίδιο πλήθος τιμών και τουλάχιστον 2 διαφορετικές κατηγορίες.";
            guide.Cell(12, 1).Value = "10. Η θεματολογία δεν γράφεται στο Excel. Επιλέγεται από την εφαρμογή.";
            guide.Cell(13, 1).Value = "11. Αν το QUESTION TYPE μείνει κενό, θεωρείται Multiple Choice (1).";

            guide.Cell(15, 1).Value = "Παραδείγματα:";
            guide.Cell(15, 1).Style.Font.Bold = true;

            for (int col = 1; col <= 11; col++)
            {
                guide.Cell(17, col).Value = ws.Cell(1, col).Value;
            }

            guide.Cell(18, 1).Value = "Πρόληψη";
            guide.Cell(18, 2).Value = "Βασικές αρχές πρόληψης.";
            guide.Cell(18, 3).Value = "Ποιος είναι ο βασικός στόχος της πρόληψης;";
            guide.Cell(18, 4).Value = "Η αποφυγή ατυχημάτων;Η ταχύτερη εργασία;Η μείωση των διαλειμμάτων";
            guide.Cell(18, 5).Value = "1";
            guide.Cell(18, 6).Value = "1";
            guide.Cell(18, 7).Value = "1";

            guide.Cell(19, 1).Value = "Ασφάλεια";
            guide.Cell(19, 2).Value = "Έλεγχος βασικών γνώσεων.";
            guide.Cell(19, 3).Value = "Η έξοδος κινδύνου πρέπει να είναι πάντα ελεύθερη.";
            guide.Cell(19, 5).Value = "1";
            guide.Cell(19, 6).Value = "1";
            guide.Cell(19, 7).Value = "2";

            guide.Cell(20, 1).Value = "Πυρασφάλεια";
            guide.Cell(20, 2).Value = "Σωστή ακολουθία ενεργειών.";
            guide.Cell(20, 3).Value = "Βάλε τα βήματα στη σωστή σειρά.";
            guide.Cell(20, 4).Value = "Πήγαινε στο σημείο συγκέντρωσης;Ενεργοποίησε τον συναγερμό;Κατευθύνσου στην έξοδο;Ενημέρωσε τον υπεύθυνο";
            guide.Cell(20, 6).Value = "2";
            guide.Cell(20, 7).Value = "3";
            guide.Cell(20, 8).Value = "4;1;3;2";

            guide.Cell(21, 1).Value = "Κίνδυνοι";
            guide.Cell(21, 2).Value = "Αντιστοίχιση κινδύνου και ενέργειας.";
            guide.Cell(21, 3).Value = "Αντιστοίχισε τον κίνδυνο με τη σωστή ενέργεια.";
            guide.Cell(21, 6).Value = "2";
            guide.Cell(21, 7).Value = "4";
            guide.Cell(21, 9).Value = "Βρεγμένο πάτωμα;Γυμνό καλώδιο;Εμπόδιο στον διάδρομο";
            guide.Cell(21, 10).Value = "Τοποθέτησε πινακίδα;Κλείσε το ρεύμα;Απομάκρυνε το εμπόδιο";

            guide.Cell(22, 1).Value = "ΜΑΠ";
            guide.Cell(22, 2).Value = "Κατηγοριοποίηση αντικειμένων.";
            guide.Cell(22, 3).Value = "Τοποθέτησε κάθε κάρτα στη σωστή κατηγορία.";
            guide.Cell(22, 4).Value = "Βρεγμένο πάτωμα;Γυμνό καλώδιο;Κράνος ασφαλείας;Γάντια εργασίας";
            guide.Cell(22, 6).Value = "1";
            guide.Cell(22, 7).Value = "5";
            guide.Cell(22, 11).Value = "Κίνδυνος;Κίνδυνος;Προστασία;Προστασία";

            var guideHeader = guide.Range(17, 1, 17, 11);
            guideHeader.Style.Font.Bold = true;
            guideHeader.Style.Fill.BackgroundColor = XLColor.FromHtml("#D9EAF7");
            guideHeader.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            guideHeader.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            guideHeader.Style.Border.InsideBorder = XLBorderStyleValues.Thin;

            var exampleRows = guide.Range(18, 1, 22, 11);
            exampleRows.Style.Font.Italic = true;
            exampleRows.Style.Font.FontColor = XLColor.Gray;
            exampleRows.Style.Fill.BackgroundColor = XLColor.FromHtml("#F7F9FC");
            exampleRows.Style.Alignment.WrapText = true;

            guide.Columns().AdjustToContents();
            guide.Column(2).Width = 60;
            guide.Column(3).Width = 55;
            guide.Column(4).Width = 75;
            guide.Column(5).Width = 35;
            guide.Column(6).Width = 25;
            guide.Column(7).Width = 20;
            guide.Column(8).Width = 40;
            guide.Column(9).Width = 55;
            guide.Column(10).Width = 55;
            guide.Column(11).Width = 45;

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
                using var workbook = new XLWorkbook(stream);

                var ws = workbook.Worksheet(1);

                var rows = new List<(
                    int ExcelRowNumber,
                    string Theory,
                    string TheoryDetails,
                    string Question,
                    string Answers,
                    int? CorrectAnswer,
                    int? Difficulty,
                    int QuestionType,
                    string OrderPosition,
                    string MatchLeft,
                    string MatchRight,
                    string CategoryName
                )>();

                int lastRowNumber = ws.LastRowUsed()?.RowNumber() ?? 1;

                for (int rowNumber = 2; rowNumber <= lastRowNumber; rowNumber++)
                {
                    string theory = ws.Cell(rowNumber, 1).GetString().Trim();
                    string theoryDetails = ws.Cell(rowNumber, 2).GetString().Trim();
                    string question = ws.Cell(rowNumber, 3).GetString().Trim();
                    string answers = ws.Cell(rowNumber, 4).GetString().Trim();
                    string correctAnswerText = ws.Cell(rowNumber, 5).GetString().Trim();
                    string difficultyText = ws.Cell(rowNumber, 6).GetString().Trim();
                    string questionTypeText = ws.Cell(rowNumber, 7).GetString().Trim();
                    string orderPosition = ws.Cell(rowNumber, 8).GetString().Trim();
                    string matchLeft = ws.Cell(rowNumber, 9).GetString().Trim();
                    string matchRight = ws.Cell(rowNumber, 10).GetString().Trim();
                    string categoryName = ws.Cell(rowNumber, 11).GetString().Trim();

                    bool rowIsEmpty =
                        string.IsNullOrWhiteSpace(theory) &&
                        string.IsNullOrWhiteSpace(theoryDetails) &&
                        string.IsNullOrWhiteSpace(question) &&
                        string.IsNullOrWhiteSpace(answers) &&
                        string.IsNullOrWhiteSpace(correctAnswerText) &&
                        string.IsNullOrWhiteSpace(difficultyText) &&
                        string.IsNullOrWhiteSpace(questionTypeText) &&
                        string.IsNullOrWhiteSpace(orderPosition) &&
                        string.IsNullOrWhiteSpace(matchLeft) &&
                        string.IsNullOrWhiteSpace(matchRight) &&
                        string.IsNullOrWhiteSpace(categoryName);

                    if (rowIsEmpty)
                    {
                        continue;
                    }

                    int? correctAnswer = null;
                    if (int.TryParse(correctAnswerText, out int correctAnswerParsed))
                    {
                        correctAnswer = correctAnswerParsed;
                    }

                    int? difficulty = null;
                    if (int.TryParse(difficultyText, out int difficultyParsed))
                    {
                        difficulty = difficultyParsed;
                    }

                    int questionType = 1;

                    if (!string.IsNullOrWhiteSpace(questionTypeText))
                    {
                        if (!int.TryParse(questionTypeText, out questionType))
                        {
                            ret.IsSuccess = false;
                            ret.Message =
                                $"Γραμμή {rowNumber}: Το QUESTION TYPE πρέπει να είναι αριθμός από 1 έως 5.";
                            return ret;
                        }
                    }

                    rows.Add((
                        rowNumber,
                        theory,
                        theoryDetails,
                        question,
                        answers,
                        correctAnswer,
                        difficulty,
                        questionType,
                        orderPosition,
                        matchLeft,
                        matchRight,
                        categoryName
                    ));
                }

                if (!rows.Any())
                {
                    ret.IsSuccess = false;
                    ret.Message = "Το Excel δεν περιέχει δεδομένα.";
                    return ret;
                }

                List<msc_Thematologia_Theoria> theories =
                    await _context.msc_Thematologia_Theoria
                        .Where(x => x.Id == thematologiaId)
                        .ToListAsync();

                foreach (var row in rows)
                {
                    if (string.IsNullOrWhiteSpace(row.Theory))
                    {
                        log += $"Γραμμή {row.ExcelRowNumber}: Λείπει η θεωρία.\n";
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(row.Question))
                    {
                        log += $"Γραμμή {row.ExcelRowNumber}: Λείπει η ερώτηση.\n";
                        continue;
                    }

                    if (row.QuestionType < 1 || row.QuestionType > 5)
                    {
                        log += $"Γραμμή {row.ExcelRowNumber}: Το QUESTION TYPE πρέπει να είναι από 1 έως 5.\n";
                        continue;
                    }

                    int difficulty = 1;

                    if (row.Difficulty == 1 || row.Difficulty == 2)
                    {
                        difficulty = row.Difficulty.Value;
                    }

                    var normalAnswers = row.Answers
                        .Split(';', StringSplitOptions.RemoveEmptyEntries)
                        .Select(x => x.Trim())
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .ToList();

                    var orderPositionsText = row.OrderPosition
                        .Split(';', StringSplitOptions.RemoveEmptyEntries)
                        .Select(x => x.Trim())
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .ToList();

                    var matchLeftItems = row.MatchLeft
                        .Split(';', StringSplitOptions.RemoveEmptyEntries)
                        .Select(x => x.Trim())
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .ToList();

                    var matchRightItems = row.MatchRight
                        .Split(';', StringSplitOptions.RemoveEmptyEntries)
                        .Select(x => x.Trim())
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .ToList();

                    var categoryNames = row.CategoryName
                        .Split(';', StringSplitOptions.RemoveEmptyEntries)
                        .Select(x => x.Trim())
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .ToList();

                    if (row.QuestionType == 1)
                    {
                        if (normalAnswers.Count < 2)
                        {
                            log += $"Γραμμή {row.ExcelRowNumber}: Η Multiple Choice ερώτηση πρέπει να έχει τουλάχιστον 2 απαντήσεις.\n";
                            continue;
                        }

                        if (!row.CorrectAnswer.HasValue ||
                            row.CorrectAnswer.Value < 1 ||
                            row.CorrectAnswer.Value > normalAnswers.Count)
                        {
                            log += $"Γραμμή {row.ExcelRowNumber}: Η σωστή απάντηση πρέπει να είναι από 1 έως {normalAnswers.Count}.\n";
                            continue;
                        }
                    }

                    if (row.QuestionType == 2)
                    {
                        if (!row.CorrectAnswer.HasValue ||
                            (row.CorrectAnswer.Value != 1 &&
                             row.CorrectAnswer.Value != 2))
                        {
                            log += $"Γραμμή {row.ExcelRowNumber}: Για True / False η σωστή απάντηση πρέπει να είναι 1 για Σωστό ή 2 για Λάθος.\n";
                            continue;
                        }
                    }

                    List<int> orderPositions = new List<int>();

                    if (row.QuestionType == 3)
                    {
                        if (normalAnswers.Count < 2)
                        {
                            log += $"Γραμμή {row.ExcelRowNumber}: Η Ordering ερώτηση πρέπει να έχει τουλάχιστον 2 βήματα.\n";
                            continue;
                        }

                        if (orderPositionsText.Count != normalAnswers.Count)
                        {
                            log += $"Γραμμή {row.ExcelRowNumber}: Οι τιμές ORDER POSITION πρέπει να είναι όσες και οι απαντήσεις.\n";
                            continue;
                        }

                        bool invalidOrderPosition = false;

                        foreach (string positionText in orderPositionsText)
                        {
                            if (!int.TryParse(positionText, out int position))
                            {
                                invalidOrderPosition = true;
                                break;
                            }

                            orderPositions.Add(position);
                        }

                        if (invalidOrderPosition)
                        {
                            log += $"Γραμμή {row.ExcelRowNumber}: Το ORDER POSITION πρέπει να περιέχει μόνο αριθμούς.\n";
                            continue;
                        }

                        var expectedPositions =
                            Enumerable.Range(1, normalAnswers.Count).ToList();

                        var actualPositions =
                            orderPositions
                                .OrderBy(x => x)
                                .ToList();

                        if (!expectedPositions.SequenceEqual(actualPositions))
                        {
                            log += $"Γραμμή {row.ExcelRowNumber}: Το ORDER POSITION πρέπει να περιέχει ακριβώς τις θέσεις 1 έως {normalAnswers.Count}, χωρίς διπλότυπα.\n";
                            continue;
                        }
                    }

                    if (row.QuestionType == 4)
                    {
                        if (matchLeftItems.Count < 2 ||
                            matchRightItems.Count < 2)
                        {
                            log += $"Γραμμή {row.ExcelRowNumber}: Η Matching ερώτηση πρέπει να έχει τουλάχιστον 2 ζευγάρια.\n";
                            continue;
                        }

                        if (matchLeftItems.Count != matchRightItems.Count)
                        {
                            log += $"Γραμμή {row.ExcelRowNumber}: MATCH LEFT και MATCH RIGHT πρέπει να έχουν ίδιο πλήθος τιμών.\n";
                            continue;
                        }
                    }

                    if (row.QuestionType == 5)
                    {
                        if (normalAnswers.Count < 2)
                        {
                            log += $"Γραμμή {row.ExcelRowNumber}: Η Categorization ερώτηση πρέπει να έχει τουλάχιστον 2 κάρτες.\n";
                            continue;
                        }

                        if (categoryNames.Count != normalAnswers.Count)
                        {
                            log += $"Γραμμή {row.ExcelRowNumber}: Τα CATEGORY NAME πρέπει να είναι όσα και οι απαντήσεις.\n";
                            continue;
                        }

                        int distinctCategories = categoryNames
                            .Distinct(StringComparer.OrdinalIgnoreCase)
                            .Count();

                        if (distinctCategories < 2)
                        {
                            log += $"Γραμμή {row.ExcelRowNumber}: Η Categorization ερώτηση πρέπει να έχει τουλάχιστον 2 διαφορετικές κατηγορίες.\n";
                            continue;
                        }
                    }

                    int detIdNew;

                    msc_Thematologia_Theoria theoryFound =
                        theories
                            .FirstOrDefault(x =>
                                x.Header.Trim() ==
                                row.Theory.Trim());

                    if (theoryFound != null)
                    {
                        detIdNew = theoryFound.DetId;
                    }
                    else
                    {
                        detIdNew =
                            theories.Count > 0
                                ? theories.Max(x => x.DetId) + 1
                                : 1;

                        msc_Thematologia_Theoria newTheory =
                            new msc_Thematologia_Theoria()
                            {
                                Id = thematologiaId,
                                DetId = detIdNew,
                                CreateDate = DateTime.Now,
                                Username = "admin",
                                Header = row.Theory,
                                Details = row.TheoryDetails
                            };

                        _context.msc_Thematologia_Theoria.Add(newTheory);
                        theories.Add(newTheory);

                        theoryFound = newTheory;
                    }

                    List<msc_Thematologia_Question> questions =
                        await _context.msc_Thematologia_Question
                            .Where(x =>
                                x.Id == thematologiaId &&
                                x.DetId == detIdNew)
                            .ToListAsync();

                    msc_Thematologia_Question questionFound =
                        questions
                            .FirstOrDefault(x =>
                                x.DetId == theoryFound.DetId &&
                                x.Question == row.Question);

                    if (questionFound != null)
                    {
                        log += $"Γραμμή {row.ExcelRowNumber}: Η ερώτηση υπάρχει ήδη.\n";
                        continue;
                    }

                    int qidNew =
                        questions.Count > 0
                            ? questions.Max(x => x.QId) + 1
                            : 1;

                    msc_Thematologia_Question newQuestion =
                        new msc_Thematologia_Question()
                        {
                            Id = thematologiaId,
                            DetId = detIdNew,
                            QId = qidNew,
                            CreateDate = DateTime.Now,
                            Username = "admin",
                            Question = row.Question,
                            Difficulty = difficulty,
                            QuestionType = row.QuestionType
                        };

                    _context.msc_Thematologia_Question.Add(newQuestion);

                    List<msc_Thematologia_Answers> answersToAdd =
                        new List<msc_Thematologia_Answers>();

                    if (row.QuestionType == 1)
                    {
                        int aId = 1;

                        foreach (string answer in normalAnswers)
                        {
                            answersToAdd.Add(
                                new msc_Thematologia_Answers
                                {
                                    Id = thematologiaId,
                                    DetId = detIdNew,
                                    QId = newQuestion.QId,
                                    AId = aId,
                                    CreateDate = DateTime.Now,
                                    Username = "admin",
                                    Answer = answer,
                                    IsCorrect =

                                        row.CorrectAnswer == aId,
                                    MatchLeft = null,
                                    MatchRight = null,
                                    CategoryName = null
                                });

                            aId++;
                        }
                    }
                    else if (row.QuestionType == 2)
                    {
                        answersToAdd.Add(
                            new msc_Thematologia_Answers
                            {
                                Id = thematologiaId,
                                DetId = detIdNew,
                                QId = newQuestion.QId,
                                AId = 1,
                                CreateDate = DateTime.Now,
                                Username = "admin",
                                Answer = "Σωστό",
                                IsCorrect = row.CorrectAnswer == 1,
                                MatchLeft = null,
                                MatchRight = null,
                                CategoryName = null
                            });

                        answersToAdd.Add(
                            new msc_Thematologia_Answers
                            {
                                Id = thematologiaId,
                                DetId = detIdNew,
                                QId = newQuestion.QId,
                                AId = 2,
                                CreateDate = DateTime.Now,
                                Username = "admin",
                                Answer = "Λάθος",
                                IsCorrect = row.CorrectAnswer == 2,
                                MatchLeft = null,
                                MatchRight = null,
                                CategoryName = null
                            });
                    }
                    else if (row.QuestionType == 3)
                    {
                        var orderedItems =
                            normalAnswers
                                .Select((answer, index) => new
                                {
                                    Answer = answer,
                                    Position = orderPositions[index]
                                })
                                .OrderBy(x => x.Position)
                                .ToList();

                        int aId = 1;

                        foreach (var item in orderedItems)
                        {
                            answersToAdd.Add(
                                new msc_Thematologia_Answers
                                {
                                    Id = thematologiaId,
                                    DetId = detIdNew,
                                    QId = newQuestion.QId,
                                    AId = aId,
                                    CreateDate = DateTime.Now,
                                    Username = "admin",
                                    Answer = item.Answer,
                                    IsCorrect = false,
                                    MatchLeft = null,
                                    MatchRight = null,
                                    CategoryName = null
                                });

                            aId++;
                        }
                    }
                    else if (row.QuestionType == 4)
                    {
                        for (int i = 0; i < matchLeftItems.Count; i++)
                        {
                            answersToAdd.Add(
                                new msc_Thematologia_Answers
                                {
                                    Id = thematologiaId,
                                    DetId = detIdNew,
                                    QId = newQuestion.QId,
                                    AId = i + 1,
                                    CreateDate = DateTime.Now,
                                    Username = "admin",
                                    Answer = "",
                                    IsCorrect = false,
                                    MatchLeft = matchLeftItems[i],
                                    MatchRight = matchRightItems[i],
                                    CategoryName = null
                                });
                        }
                    }
                    else if (row.QuestionType == 5)
                    {
                        for (int i = 0; i < normalAnswers.Count; i++)
                        {
                            answersToAdd.Add(
                                new msc_Thematologia_Answers
                                {
                                    Id = thematologiaId,
                                    DetId = detIdNew,
                                    QId = newQuestion.QId,
                                    AId = i + 1,
                                    CreateDate = DateTime.Now,
                                    Username = "admin",
                                    Answer = normalAnswers[i],
                                    IsCorrect = false,
                                    MatchLeft = null,
                                    MatchRight = null,
                                    CategoryName = categoryNames[i]
                                });
                        }
                    }

                    if (answersToAdd.Count > 0)
                    {
                        await _context.msc_Thematologia_Answers
                            .AddRangeAsync(answersToAdd);
                    }

                    await _context.SaveChangesAsync();
                }

                ret.IsSuccess = true;
                ret.Message =
                    string.IsNullOrWhiteSpace(log)
                        ? ret.Message
                        : log;

                return ret;
            }
            catch (Exception ex)
            {
                ret.IsSuccess = false;
                ret.Message =
                    ex.InnerException?.Message ??
                    ex.Message;

                return ret;
            }
        }


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

                await _auditService.LogAsync(
                    actionType: "ADD_USER",
                    tableName: "msc_Users",
                    recordId: user.Id.ToString(),
                    description: $"Προστέθηκε ο χρήστης {user.Email}.",
                    newValues: new
                    {
                        user.Id,
                        user.Email,
                        user.RoleId,
                        user.IsActive,
                        user.CreatedAt
                    });

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

            bool oldStatus = user.IsActive;

            user.IsActive = request.IsActive;

            await _context.SaveChangesAsync();

            await _auditService.LogAsync(
                actionType: request.IsActive
                    ? "ACTIVATE_USER"
                    : "DEACTIVATE_USER",
                tableName: "msc_Users",
                recordId: user.Id.ToString(),
                description: request.IsActive
                    ? $"Ενεργοποιήθηκε ο χρήστης {user.Email}."
                    : $"Απενεργοποιήθηκε ο χρήστης {user.Email}.",
                oldValues: new
                {
                    IsActive = oldStatus
                },
                newValues: new
                {
                    IsActive = user.IsActive
                });

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

            try
            {
                if (file == null || file.Length == 0)
                {
                    ret.IsSuccess = false;
                    ret.Message = "Δεν επιλέχθηκε αρχείο.";
                    return Ok(ret);
                }

                int inserted = 0;
                int skipped = 0;

                var insertedEmails = new List<string>();

                using var stream = file.OpenReadStream();
                using var workbook = new XLWorkbook(stream);

                var worksheet = workbook.Worksheet(1);
                var rows = worksheet.RowsUsed().Skip(1);

                foreach (var row in rows)
                {
                    string email = row.Cell(1)
                        .GetString()
                        .Trim()
                        .ToLower();

                    if (string.IsNullOrWhiteSpace(email))
                    {
                        skipped++;
                        continue;
                    }

                    bool isValidEmail = Regex.IsMatch(
                        email,
                        @"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
                    );

                    if (!isValidEmail)
                    {
                        skipped++;
                        continue;
                    }

                    bool existsInDatabase = await _context.msc_Users
                        .AnyAsync(x => x.Email == email);

                    bool existsInCurrentImport = insertedEmails.Contains(email);

                    if (existsInDatabase || existsInCurrentImport)
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

                    insertedEmails.Add(email);
                    inserted++;
                }

                await _context.SaveChangesAsync();

                await _auditService.LogAsync(
                    actionType: "IMPORT_USERS_EXCEL",
                    tableName: "msc_Users",
                    description:
                        $"Έγινε εισαγωγή χρηστών από το αρχείο '{file.FileName}'. " +
                        $"Νέοι χρήστες: {inserted}, αγνοήθηκαν: {skipped}.",
                    newValues: new
                    {
                        FileName = file.FileName,
                        Inserted = inserted,
                        Skipped = skipped,
                        InsertedEmails = insertedEmails
                    }
                );

                ret.IsSuccess = true;
                ret.Message =
                    $"Η εισαγωγή ολοκληρώθηκε. " +
                    $"Νέοι χρήστες: {inserted}, " +
                    $"Υπάρχοντες ή μη έγκυροι που αγνοήθηκαν: {skipped}.";

                return Ok(ret);
            }
            catch (Exception ex)
            {
                ret.IsSuccess = false;
                ret.Message = $"Αποτυχία εισαγωγής αρχείου: {ex.Message}";

                return BadRequest(ret);
            }
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
        private async Task SyncTheoryVideos(

            int thematologiaId,
            int theoryDetId,
            string? details)
        {
            var videoUrls = new List<string>();

            if (!string.IsNullOrWhiteSpace(details))
            {
                var matches = Regex.Matches(
                    details,
                    @"<video[^>]*src=[""']([^""']+)[""'][^>]*>",
                    RegexOptions.IgnoreCase
                );

                foreach (Match match in matches)
                {
                    var videoUrl = match.Groups[1].Value;

                    if (!string.IsNullOrWhiteSpace(videoUrl))
                    {
                        videoUrls.Add(videoUrl);
                    }
                }
            }

            var existingVideos =
                await _context.TheoriaVideos
                    .Where(x =>
                        x.ThematologiaId == thematologiaId &&
                        x.TheoryDetId == theoryDetId)
                    .ToListAsync();

            // Διαγράφουμε videos που αφαιρέθηκαν από τη θεωρία
            foreach (var existingVideo in existingVideos)
            {
                if (!videoUrls.Contains(existingVideo.VideoUrl))
                {
                    _context.TheoriaVideos.Remove(existingVideo);
                }
            }

            // Προσθέτουμε μόνο videos που δεν υπάρχουν ήδη
            foreach (var videoUrl in videoUrls)
            {
                var alreadyExists =
                    existingVideos.Any(x =>
                        x.VideoUrl == videoUrl);

                if (alreadyExists)
                {
                    continue;
                }

                var uri = new Uri(videoUrl);

                var path =
                    Uri.UnescapeDataString(
                        uri.AbsolutePath.TrimStart('/')
                    );

                var firstSlash = path.IndexOf('/');

                var blobName =
                    firstSlash >= 0
                        ? path[(firstSlash + 1)..]
                        : path;

                var video = new msc_TheoriaVideo
                {
                    ThematologiaId = thematologiaId,
                    TheoryDetId = theoryDetId,
                    VideoUrl = videoUrl,
                    BlobName = blobName,
                    CreatedDate = DateTime.Now
                };

                _context.TheoriaVideos.Add(video);
            }
        }
    }
}
