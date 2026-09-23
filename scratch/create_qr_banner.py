import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

def create_qr_and_banner():
    project_dir = r"C:\Users\venka\Downloads\66"
    target_url = "https://sriayyappacracker.vercel.app"
    
    # 1. Generate High-Res Pure QR Code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=24,
        border=4,
    )
    qr.add_data(target_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="#0d0c1b", back_color="#ffffff").convert("RGBA")
    
    # Save clean QR code
    qr_clean_path = os.path.join(project_dir, "sri_ayyappa_crackers_qr_code.png")
    qr_img.save(qr_clean_path)
    print(f"Clean QR saved at: {qr_clean_path}")
    
    # Also save in images/ folder
    os.makedirs(os.path.join(project_dir, "images"), exist_ok=True)
    qr_img.save(os.path.join(project_dir, "images", "sri_ayyappa_crackers_qr_code.png"))

    # 2. Design Full Professional Festive Standee Banner (1200 x 1800 px)
    width = 1200
    height = 1800
    
    banner = Image.new("RGBA", (width, height), (13, 10, 25, 255))
    draw = ImageDraw.Draw(banner)
    
    # Draw Background Gradient (Deep Maroon #5e0211 to Dark Violet #0d0a1b)
    for y in range(height):
        ratio = y / height
        # Gradient from rich festive red-maroon at top to royal night dark at bottom
        r = int(95 * (1 - ratio*0.7) + 12 * (ratio*0.7))
        g = int(5 * (1 - ratio) + 8 * ratio)
        b = int(18 * (1 - ratio*0.8) + 26 * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
        
    # Draw Festive Golden Outer Border
    border_margin = 35
    for i in range(4):
        draw.rectangle(
            [border_margin - i, border_margin - i, width - border_margin + i, height - border_margin + i],
            outline=(255, 196, 0, 200 - i * 40),
            width=2
        )
    # Inner thin border
    draw.rectangle(
        [border_margin + 12, border_margin + 12, width - border_margin - 12, height - border_margin - 12],
        outline=(218, 165, 32, 120),
        width=1
    )
    
    # Corner Ornaments
    ornament_size = 45
    corners = [
        (border_margin + 12, border_margin + 12),
        (width - border_margin - 12, border_margin + 12),
        (border_margin + 12, height - border_margin - 12),
        (width - border_margin - 12, height - border_margin - 12)
    ]
    for cx, cy in corners:
        draw.arc([cx - ornament_size, cy - ornament_size, cx + ornament_size, cy + ornament_size], 0, 360, fill=(255, 215, 0, 200), width=3)
        draw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=(255, 215, 0, 255))

    # Font Setup
    try:
        font_title_large = ImageFont.truetype("arialbd.ttf", 68)
        font_title_sub = ImageFont.truetype("arialbd.ttf", 36)
        font_tagline = ImageFont.truetype("arial.ttf", 26)
        font_badge = ImageFont.truetype("arialbd.ttf", 34)
        font_scan = ImageFont.truetype("arialbd.ttf", 46)
        font_url = ImageFont.truetype("arialbd.ttf", 34)
        font_contact_name = ImageFont.truetype("arialbd.ttf", 30)
        font_contact_phone = ImageFont.truetype("arialbd.ttf", 32)
        font_footer = ImageFont.truetype("arial.ttf", 22)
    except Exception:
        font_title_large = ImageFont.load_default()
        font_title_sub = font_title_large
        font_tagline = font_title_large
        font_badge = font_title_large
        font_scan = font_title_large
        font_url = font_title_large
        font_contact_name = font_title_large
        font_contact_phone = font_title_large
        font_footer = font_title_large

    # Top Header Badge
    top_badge_y = 75
    draw.rounded_rectangle([320, top_badge_y, 880, top_badge_y + 54], radius=27, fill=(255, 42, 75, 230), outline=(255, 215, 0, 255), width=2)
    draw.text((width // 2, top_badge_y + 27), "DIWALI 2026 SPECIAL WHOLESALE COLLECTION", font=ImageFont.truetype("arialbd.ttf", 22), fill=(255, 255, 255), anchor="mm")

    # Main Brand Header
    header_y = 175
    draw.text((width // 2, header_y), "SRI AYYAPPA CRACKERS", font=font_title_large, fill=(255, 215, 0), anchor="mm")
    draw.text((width // 2, header_y + 60), "STANDARD SIVAKASI FIREWORKS", font=font_title_sub, fill=(255, 255, 255), anchor="mm")
    draw.text((width // 2, header_y + 110), "100% Genuine Sivakasi Quality Direct Wholesale Booking", font=font_tagline, fill=(225, 220, 245), anchor="mm")

    # Load Hero Banner Image to include Lord Sri Ayyappa artwork
    hero_banner_path = os.path.join(project_dir, "images", "hero-banner-2.jpg")
    if os.path.exists(hero_banner_path):
        try:
            hero_img = Image.open(hero_banner_path).convert("RGBA")
            # Crop center nicely and resize to fit top showcase (1040 x 380)
            hero_w, hero_h = 1060, 390
            hero_crop = hero_img.resize((hero_w, hero_h), Image.Resampling.LANCZOS)
            
            # Mask with rounded corners
            mask = Image.new("L", (hero_w, hero_h), 0)
            mask_draw = ImageDraw.Draw(mask)
            mask_draw.rounded_rectangle([0, 0, hero_w, hero_h], radius=20, fill=255)
            
            banner_x = (width - hero_w) // 2
            banner_y = 330
            banner.paste(hero_crop, (banner_x, banner_y), mask)
            
            # Border around showcase
            draw.rounded_rectangle([banner_x, banner_y, banner_x + hero_w, banner_y + hero_h], radius=20, outline=(255, 196, 0, 220), width=3)
        except Exception as e:
            print("Hero image error:", e)

    # 20% DISCOUNT RIBBON BADGE
    disc_y = 750
    draw.rounded_rectangle([200, disc_y, 1000, disc_y + 70], radius=35, fill=(179, 0, 30, 255), outline=(255, 215, 0, 255), width=3)
    draw.text((width // 2, disc_y + 35), "FLAT 20% SPECIAL FESTIVE DISCOUNT ON ALL ITEMS!", font=font_badge, fill=(255, 235, 59), anchor="mm")

    # Center QR Card
    qr_card_y = 855
    qr_card_w = 640
    qr_card_h = 610
    qr_card_x = (width - qr_card_w) // 2
    
    # White golden card backing
    draw.rounded_rectangle([qr_card_x, qr_card_y, qr_card_x + qr_card_w, qr_card_y + qr_card_h], radius=28, fill=(255, 255, 255, 255), outline=(255, 196, 0, 255), width=4)
    
    # Top instruction inside card
    draw.text((width // 2, qr_card_y + 40), "SCAN TO BOOK ONLINE", font=font_scan, fill=(160, 0, 20), anchor="mm")
    draw.text((width // 2, qr_card_y + 78), "Instant Catalog · Live Cart · WhatsApp Bill", font=ImageFont.truetype("arialbd.ttf", 20), fill=(80, 80, 80), anchor="mm")

    # Resize QR Code to fit card
    qr_display_size = 370
    qr_resized = qr_img.resize((qr_display_size, qr_display_size), Image.Resampling.LANCZOS)
    qr_pos_x = (width - qr_display_size) // 2
    qr_pos_y = qr_card_y + 105
    banner.paste(qr_resized, (qr_pos_x, qr_pos_y), qr_resized)

    # Website URL below QR code inside card
    draw.rounded_rectangle([qr_card_x + 40, qr_card_y + qr_card_h - 75, qr_card_x + qr_card_w - 40, qr_card_y + qr_card_h - 20], radius=15, fill=(245, 243, 235), outline=(218, 165, 32), width=1)
    draw.text((width // 2, qr_card_y + qr_card_h - 48), "sriayyappacracker.vercel.app", font=font_url, fill=(10, 80, 180), anchor="mm")

    # Order Helpline Section
    contact_y = 1480
    draw.text((width // 2, contact_y), "OFFICIAL ORDER HELPLINE & WHATSAPP BOOKING", font=ImageFont.truetype("arialbd.ttf", 26), fill=(255, 215, 0), anchor="mm")

    # Contact Cards (2 Columns)
    contacts = [
        ("GOWTHAM", "96404 99753", "Orders & Dispatch"),
        ("GURUSWAMI", "95730 47342", "Wholesale & Packs")
    ]
    box_w = 360
    box_h = 135
    spacing = 30
    total_w = 2 * box_w + spacing
    start_x = (width - total_w) // 2
    
    for i, (name, phone, role) in enumerate(contacts):
        bx = start_x + i * (box_w + spacing)
        by = contact_y + 30
        draw.rounded_rectangle([bx, by, bx + box_w, by + box_h], radius=16, fill=(28, 22, 52, 230), outline=(255, 196, 0, 180), width=2)
        draw.text((bx + box_w // 2, by + 28), name, font=font_contact_name, fill=(255, 215, 0), anchor="mm")
        draw.text((bx + box_w // 2, by + 65), f"CALL: {phone}", font=font_contact_phone, fill=(255, 255, 255), anchor="mm")
        draw.text((bx + box_w // 2, by + 102), role, font=ImageFont.truetype("arial.ttf", 19), fill=(200, 195, 225), anchor="mm")

    # Footer Note
    draw.text((width // 2, height - 90), "Door Delivery Across All Major Locations | Celebrate Safely With Sivakasi Fireworks", font=font_footer, fill=(200, 195, 225), anchor="mm")
    draw.text((width // 2, height - 62), "Sri Ayyappa Crackers 2026. All Rights Reserved.", font=ImageFont.truetype("arial.ttf", 18), fill=(160, 155, 185), anchor="mm")

    # Convert to RGB and Save High Quality
    final_banner = banner.convert("RGB")
    banner_save_path = os.path.join(project_dir, "sri_ayyappa_crackers_qr_banner.png")
    final_banner.save(banner_save_path, quality=95)
    print(f"Professional Standee Banner saved at: {banner_save_path}")
    
    # Also save inside images/ folder
    final_banner.save(os.path.join(project_dir, "images", "sri_ayyappa_crackers_qr_banner.png"), quality=95)

if __name__ == "__main__":
    create_qr_and_banner()
