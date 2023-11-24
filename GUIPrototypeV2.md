# Graphical User Interface Prototype - FUTURE

Authors: Giuseppe Silvestri

Date: 15/04/2023

Version: V2 - description of EZWallet in FUTURE form (as proposed by the team)

NOTE: in the images "App Icon" is used as a placeholder for EZWallet's logo, which has not been defined yet.

## Homepage

![Homepage](code/images/GUIPrototypeV2/Homepage.png)

Clicking "Login / Register" leads to the [login page](#login-page).

## Login Page

![Login Page](code/images/GUIPrototypeV2/Login%20Page.png)

- Clicking "Homepage" leads to the [homepage](#homepage);
- clicking "Register" leads to the [registration page](#registration-page);
- clicking "Login" (assuming the credentials are correct) leads to the:
  - [transactions page](#transactions-page) if a user logged in;
  - [admin account page](#admin-page) if an admin logged in;
  - [COO account page](#coo-page) if the COO logged in.

## Registration Page

![Registration Page](code/images/GUIPrototypeV2/Register%20Page.png)

- Clicking "Register" (assuming the creation of the account is allowed) leads to the [transactions page](#transactions-page);
- clicking "Log in" leads to the [login page](#login-page).

## Transactions Page

NOTE: the transactions are actually the **labels**, which are comprised of transaction amount, name, **date** and the colour of the transaction's category. To get the list of transactions, the API should be used.

![Transactions Page](code/images/GUIPrototypeV2/Transaction%20Page.png)

- Clicking "My account" leads to the [user account page](#user-account-page);
- clicking "Go to categories" leads to the [categories page](#categories-page).

## Categories Page

![Categories Page](code/images/GUIPrototypeV2/Category%20Page.png)

- Clicking "My account" leads to the [user account page](#user-account-page);
- clicking "Go to transactions" leads to the [transactions page](#transactions-page).

## User Account Page

### Without family

![User Account Page w/o family](code/images/GUIPrototypeV2/User%20Page%20w_o%20family.png)

### With family

![User Account Page w/ family](code/images/GUIPrototypeV2/User%20Page%20w_%20family.png)

- Clicking "My wallet" leads to the [transactions page](#transactions-page);
- clicking "Log out" leads to the [homepage](#homepage).

## Admin Page

![Admin Page](code/images/GUIPrototypeV2/Admin%20Page.png)

Clicking "Log out" leads to the [homepage](#homepage).

## COO Page

![COO Page](code/images/GUIPrototypeV2/COO%20Page.png)

Clicking "Log out" leads to the [homepage](#homepage).
