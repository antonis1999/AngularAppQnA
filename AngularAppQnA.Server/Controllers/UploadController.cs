using AngularAppQnA.Server.Data;
using AngularAppQnA.Server.Models;
using AngularAppQnA.Server.Services;
using Microsoft.AspNetCore.Mvc;

namespace AngularAppQnA.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UploadController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly BlobStorageService _blobStorageService;

        public UploadController(
            AppDbContext context,
            BlobStorageService blobStorageService)
        {
            _context = context;
            _blobStorageService = blobStorageService;
        }

        [HttpPost("TheoryImage")]
        public async Task<IActionResult> UploadTheoryImage(
       IFormFile file,
       int thematologiaId,
       int theoryDetId)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest("Δεν επιλέχθηκε εικόνα.");
            }

            var result = await _blobStorageService.UploadImageAsync(
                file,
                thematologiaId,
                theoryDetId);

            var image = new msc_TheoriaImage
            {
                ThematologiaId = thematologiaId,
                TheoryDetId = theoryDetId,

                ImageUrl = result.ImageUrl,
                BlobName = result.BlobName,

                CreatedDate = DateTime.Now
            };

            _context.TheoriaImages.Add(image);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                imageUrl = result.ImageUrl
            });
        }
        [HttpPost("TheoryVideo")]
        public async Task<IActionResult> UploadTheoryVideo(
            IFormFile file,
            int thematologiaId, 
            int theoryDetId)
        {
            if (file == null || file.Length == 0)
                return BadRequest("Δεν επιλέχθηκε video.");

            var result =
                await _blobStorageService.UploadVideoAsync(
                    file,
                    thematologiaId,
                    theoryDetId
                );

            return Ok(new
            {
                videoUrl = result.VideoUrl,
                blobName = result.BlobName
            });
        }
    }
}