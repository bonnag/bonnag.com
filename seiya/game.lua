-- title:  Call of the Trees
-- author: Seiya Elby
-- desc:   You are a tree in this exciting top down maze game. Art and design by a 6 year old.
-- script: lua

timeNow=0
player = {
	x=96,
	y=24,
	vx=0,
	vy=0,
	lastVx=1,
	lastVy=0,
	width = 8,
	height = 8,
	health = 100,
	score = 0,
	babies = 0
}
weapon = {
	isActive=false,
	x=0,
	y=0,
	vx=0,
	vy=0,
	throwTime=0,
	sn=7
}
mapx=0
mapy=0
mode = "start"
modeEnteredTime = 0
enemies = {}
room = {
	x = 0,
	y = 0
}
spriteByName = {
	empty = 0,
	player = 1,
	baby = 3,
	shadowBaby = 4,
	door = 17,
	leaf = 21,
	fireWall = 24,
	brickWall = 23,
	lockedDoor = 19,
	key = 20,
	sadFace = 32,
	happyFace = 34
}
enemiesByRoomKey = {}

function changeMode(newMode)
    mode = newMode
    modeEnteredTime = timeNow
end

function readMovementKeys()
	player.vx=0
	player.vy=0
	if btn(0) then player.vy = -1 end
	if btn(1) then player.vy = 1 end
	if btn(2) then player.vx = -1 end
	if btn(3) then player.vx = 1 end
	if btn(4) or btn(5) then
		throwWeapon()
	end
end

function checkPlayer()
	x = player.x + player.vx
	y = player.y + player.vy
	checkPlayerCorner(x, y)
	checkPlayerCorner(x + player.width - 1, y)
	checkPlayerCorner(x, y + player.height - 1)
	checkPlayerCorner(x + player.width - 1, y + player.height - 1)
	for i,enemy in ipairs(enemies) do
		if not enemy.isDead then
			if isTouching(player.x, player.y, 1, enemy.x, enemy.y, enemy.size) then
				ow(1)
			end
		end
	end
end

function checkWeaponHitEnemies()
	if not weapon.isActive then return end
	for i,enemy in ipairs(enemies) do
		if not enemy.isDead then
			if isTouching(weapon.x, weapon.y, 1, enemy.x, enemy.y, enemy.size) then
				sfx(2, 60, 15)
				if enemy.damage == nil then enemy.damage = 0 end
				enemy.damage = enemy.damage + 2
				player.score = player.score + 5
				if enemy.damage >= enemy.health then
					enemy.isDead = true
					sfx(2, 40, 15)
					player.score = player.score + enemy.health
				end
				weapon.isActive = false
				return
			end
		end
	end
end

function checkPlayerCorner(x, y)
	sn = spriteNumberUnder(x,y)
	if sn ~= 0 then
		player.vx = 0
		player.vy = 0
	end
	if sn == spriteByName.door then
		hitDoor()
	end
	if sn == spriteByName.lockedDoor or sn == spriteByName.fireWall then
		ow(1)
	end
	if sn == spriteByName.key then
		hitKey()
	end
	if sn == spriteByName.baby then
		hitBaby()
	end
	if sn == spriteByName.leaf then
		sfx(2, 60, 20)
		player.health = 100
		swapAllInRoom(spriteByName.leaf, spriteByName.empty)
	end
end

function hitKey()
	sfx(2, 60, 20)
	player.score = player.score + 20
	swapAllInRoom(spriteByName.key, spriteByName.empty)
	swapAllInRoom(spriteByName.lockedDoor, spriteByName.door)
	swapAllInRoom(spriteByName.fireWall, spriteByName.brickWall)
end

function hitBaby()
	sfx(2, 60, 20)
	player.score = player.score + 100
	swapAllInRoom(spriteByName.baby, spriteByName.empty)
	player.babies = player.babies + 1
	if player.babies == 3 then
		changeMode("completed")
	end
end

function swapAllInRoom(oldSn, newSn)
	for y = 0, 16 do
		for x = 0, 29 do
			if mget(mapx + x, mapy + y) == oldSn then
				mset(mapx + x, mapy + y, newSn)
			end
		end
	end
end

function ow(hurts)
	sfx(1, "C#2", 6)
	player.health = player.health - hurts
	if player.health <= 0 then
		sfx(1, 10, 100)
		changeMode("gameover")
	end
end

function hitDoor() 
	if player.x < 40 then
		room.x = room.x - 1
	end
	if player.x > 200 then
		room.x = room.x + 1
	end
	if player.y < 40 then
		room.y = room.y - 1
	end
	if player.y > 100 then
		room.y = room.y + 1
	end
	enterRoom()
end

function movePlayer()
	player.x = player.x + player.vx
	player.y = player.y + player.vy
	if player.vx ~=0 or player.vy ~= 0 then
		player.lastVx = player.vx
		player.lastVy = player.vy
	end
end

function spriteNumberUnder(x, y)
	return mget(mapx + x //8, mapy + y //8);
end

function moveEnemies()
	for i,enemy in ipairs(enemies) do
		if not enemy.isDead then
			x = enemy.x + enemy.vx
			y = enemy.y + enemy.vy
			if spriteNumberUnder(x + 4 * enemy.size, y + 4 * enemy.size) ~= 0 then
				enemy.vx = 0 - enemy.vx
				enemy.vy = 0 - enemy.vy
			else
				enemy.x = x
				enemy.y = y
			end
			if enemy.sn >= 112 and enemy.sn < 144 then
				-- boss guy
				enemy.vx = math.cos(timeNow * 0.01)
				enemy.vy = math.sin(timeNow * 0.01)
				if countEnemies() < 10 then
					if onceEverySeconds(2) then
						table.insert(enemies, {
							x=enemy.x + 4 * enemy.size,
							y=enemy.y + 4 * enemy.size,
							vx=math.cos(timeNow * 0.01),
							vy=math.sin(timeNow * 0.01),
							sn=64,
							health=3,
							size=1});
					end
				end
			end
		end
	end	
end

function countEnemies()
	count = 0
	for i,enemy in ipairs(enemies) do
		if not enemy.isDead then
			count = count + 1
		end
	end
	return count
end

function drawMap()
	map(mapx, mapy)
end

function drawEnemies()
	for i,enemy in ipairs(enemies) do
		if not enemy.isDead then
			spr(enemy.sn+flipFlop()*enemy.size,enemy.x,enemy.y,0,1,0,0,enemy.size,enemy.size)
			line(enemy.x, enemy.y - 2, enemy.x + enemy.health, enemy.y - 2, 7)
			if enemy.damage == nil then
				enemy.damage = 0
			end
			if enemy.damage > 0 then
				line(enemy.x + enemy.health - enemy.damage, enemy.y - 1, enemy.x + enemy.health, enemy.y - 1, 6)
			end
		end
	end	
end

function onceEverySeconds(n)
	return (timeNow % (n * 60)) == 0
end

function drawPlayer()
	spr(1+flipFlop(),player.x,player.y,0,1,0,0,1,1)
end

function throwWeapon()
	if weapon.isActive then return end
	weapon.x = player.x
	weapon.y = player.y
	weapon.vx = 2 * player.lastVx
	weapon.vy = 2 * player.lastVy
	weapon.throwTime = timeNow
	weapon.isActive = true
end

function moveWeapon()
	if not weapon.isActive then return end
	weapon.x = weapon.x + weapon.vx
	weapon.y = weapon.y + weapon.vy
	if timeNow - weapon.throwTime == 60 then
		weapon.vx = 0 - weapon.vx
		weapon.vy = 0 - weapon.vy
	end
	if timeNow - weapon.throwTime == 120 then
		weapon.isActive = false
	end
end

function drawWeapon()
	if weapon.isActive then
		spr(weapon.sn+flipFlop(),weapon.x,weapon.y,0,1,0,0,1,1)
	end
end

function flipFlop()
	return timeNow % 60 // 30
end

function isTouching(x1, y1, size1, x2, y2, size2)
	w1 = 8 * size1
	h1 = 8 * size1
	w2 = 8 * size2
	h2 = 8 * size2
	if x1 + w1 < x2 then return false end
	if x1 > x2 + w2 then return false end
	if y1 + h1 < y2 then return false end
	if y1 > y2 + h2 then return false end
	return true
end

function drawHud()
	print("Health", 1, 1)
	for i = 0, 10 do
		if player.health > i * 10 then
			spr(spriteByName.leaf, 38 + i * 7, 0)
		end
	end
	print("Score " .. player.score, 110, 1)
	print("Babies", 172, 1)
	for i = 1, 3 do
		if player.babies >= i then
			spr(spriteByName.baby, 200 + i * 7, -2)
		else
			spr(spriteByName.shadowBaby, 200 + i * 7, -2)
		end
	end
end

function drawGameOver()
	print("Game Over", 90, 40)
	spr(spriteByName.sadFace, 100, 60, -1, 2, 0, 0, 2, 2)
  if timeNow - modeEnteredTime > 120 then
    print("Press Z to Start Again", 70, 120)
    if btn(4) or btn(5) then
      reset()
    end
  end
end

function drawCompleted()
	print("You Won", 90, 40)
	print("Score: " .. player.score, 80, 60)
	spr(spriteByName.happyFace, 100, 80, -1, 2, 0, 0, 2, 2)
  if timeNow - modeEnteredTime > 120 then
    print("Press Z to Start Again", 70, 120)
    if btn(4) or btn(5) then
      reset()
    end
  end
end

function drawStart()
	print("Call of the Trees", 70, 40)
	print("Can you help find the baby trees?", 30, 60)
  print("Press Z to Start", 70, 80)
  print("by Seiya Elby", 80, 100)
  if btn(4) or btn(5) then
    changeMode("play")
  end
end

function enterRoom()
	weapon.isActive = false
	player.x=116
	player.y=60
	mapx = room.x * 30
	mapy = room.y * 17
	roomKey = room.x .. ":" .. room.y
	if enemiesByRoomKey[roomKey] ~= nil then
		enemies = enemiesByRoomKey[roomKey]
	end
end

function findEnemies()
	for roomy = 0, 16 do
		for roomx = 0, 29 do
			roomKey = roomx .. ":" .. roomy
			enemiesByRoomKey[roomKey] = {}
			for y = 0, 16 do
				for x = 0, 29 do
					sn = mget(roomx * 30 + x, roomy * 17 + y)
					if sn >= 64 and sn < 144 then
						mset(roomx * 30 + x, roomy * 17 + y, spriteByName.empty)
						enemy = {
							x=x * 8,
							y=y * 8,
							vx=1 - (sn % 2),
							vy=sn % 2,
							sn=sn - (sn % 2),
							size=1
						}
						if sn >= 64 and sn < 80 then
							-- easy enemies
							enemy.health=3
						end
						if sn >= 80 and sn < 112 then
							-- harder enemies
							enemy.health=7
						end
						if sn >= 112 and sn < 144 then
							-- bosses
							enemy.health=60
							enemy.size=2
							enemy.vx = 0
							enemy.vy = 0
						end
						table.insert(enemiesByRoomKey[roomKey], enemy)
					end
				end
			end
		end
	end
end

function init()
	timeNow=0
	findEnemies()
	enterRoom()
end

init()
function TIC()
	cls(13)
	if mode == "start" then
		drawStart()
	end
	if mode == "gameover" then
		drawGameOver()
	end
	if mode == "completed" then
		drawCompleted()
	end
	if mode == "play" then
		moveEnemies()
		readMovementKeys()
		checkPlayer()
		movePlayer()
		moveWeapon()
		checkWeaponHitEnemies()
		drawMap()
		drawEnemies()
		drawPlayer()
		drawWeapon()
		drawHud()
	end
	timeNow=timeNow+1
end
