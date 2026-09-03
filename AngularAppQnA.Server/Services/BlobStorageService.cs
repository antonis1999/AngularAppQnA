using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace AngularAppQnA.Server.Services
{
    public class BlobStorageService
    {
        private readonly string blobStorageConnectionString;
        private readonly string blobStorageContainerName;

        public BlobStorageService(IConfiguration configuration)
        {
            blobStorageConnectionString =
                configuration["AzureBlobStorage:ConnectionString"]
                ?? throw new InvalidOperationException(
                    "Δεν βρέθηκε Azure Blob ConnectionString.");

            blobStorageContainerName =
                configuration["AzureBlobStorage:ContainerName"]
                ?? throw new InvalidOperationException(
                    "Δεν βρέθηκε Azure Blob ContainerName.");
        }

        public async Task<(string ImageUrl, string BlobName)> UploadImageAsync(
            IFormFile file,
            int thematologiaId,
            int theoryDetId)
        {
            if (file == null || file.Length == 0)
            {
                throw new ArgumentException(
                    "Δεν επιλέχθηκε εικόνα.");
            }

            var blobServiceClient =
                new BlobServiceClient(
                    blobStorageConnectionString);

            var blobContainerClient =
                blobServiceClient.GetBlobContainerClient(
                    blobStorageContainerName);

            await blobContainerClient.CreateIfNotExistsAsync(
                PublicAccessType.Blob);

            var extension =
                Path.GetExtension(file.FileName)
                    .ToLowerInvariant();

            string contentType = extension switch
            {
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".gif" => "image/gif",
                ".bmp" => "image/bmp",
                ".tiff" => "image/tiff",
                ".webp" => "image/webp",
                _ => "application/octet-stream"
            };

            var blobName =
                $"learnimages/images/" +
                $"{thematologiaId}/" +
                $"{theoryDetId}/" +
                $"{Guid.NewGuid():N}{extension}";

            var blobClient =
                blobContainerClient.GetBlobClient(
                    blobName);

            await using var stream =
                file.OpenReadStream();

            var headers =
                new BlobHttpHeaders
                {
                    ContentType = contentType
                };

            await blobClient.UploadAsync(
                stream,
                new BlobUploadOptions
                {
                    HttpHeaders = headers
                });

            return (
                blobClient.Uri.ToString(),
                blobName
            );
        }


        public async Task<(string VideoUrl, string BlobName)> UploadVideoAsync(
            IFormFile file,
            int thematologiaId,
            int theoryDetId)
        {
            if (file == null || file.Length == 0)
            {
                throw new ArgumentException(
                    "Δεν επιλέχθηκε video.");
            }

            var blobServiceClient =
                new BlobServiceClient(
                    blobStorageConnectionString);

            var blobContainerClient =
                blobServiceClient.GetBlobContainerClient(
                    blobStorageContainerName);

            await blobContainerClient.CreateIfNotExistsAsync(
                PublicAccessType.Blob);

            var extension =
                Path.GetExtension(file.FileName)
                    .ToLowerInvariant();

            string contentType = extension switch
            {
                ".mp4" => "video/mp4",
                ".webm" => "video/webm",
                ".mov" => "video/quicktime",
                ".avi" => "video/x-msvideo",
                ".mkv" => "video/x-matroska",
                _ => "application/octet-stream"
            };

            var blobName =
                $"learnimages/videos/" +
                $"{thematologiaId}/" +
                $"{theoryDetId}/" +
                $"{Guid.NewGuid():N}{extension}";

            var blobClient =
                blobContainerClient.GetBlobClient(
                    blobName);

            await using var stream =
                file.OpenReadStream();

            var headers =
                new BlobHttpHeaders
                {
                    ContentType = contentType
                };

            await blobClient.UploadAsync(
                stream,
                new BlobUploadOptions
                {
                    HttpHeaders = headers
                });

            return (
                blobClient.Uri.ToString(),
                blobName
            );
        }
        public async Task DeleteBlobAsync(string blobName)
        {
            if (string.IsNullOrWhiteSpace(blobName))
            {
                return;
            }

            var blobServiceClient =
                new BlobServiceClient(blobStorageConnectionString);

            var blobContainerClient =
                blobServiceClient.GetBlobContainerClient(
                    blobStorageContainerName
                );

            var blobClient =
                blobContainerClient.GetBlobClient(blobName);

            await blobClient.DeleteIfExistsAsync();
        }
    }
}